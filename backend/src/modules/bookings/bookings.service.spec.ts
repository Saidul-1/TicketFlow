import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { BookingLifecycleService } from './lifecycle/booking-lifecycle.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, PricingStrategyType, SeatStatus } from '@prisma/client';

describe('BookingsService - Concurrency, Holds & Cancellation', () => {
  let service: BookingsService;
  let prisma: any;
  let pricingService: any;
  let lifecycleService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    prisma = {
      event: {
        findUnique: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      bookingStatusHistory: {
        create: jest.fn(),
      },
      seat: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    pricingService = {
      calculatePrice: jest.fn((_type, basePrice) => basePrice),
    };

    lifecycleService = {
      validateTransition: jest.fn(),
      canTransition: jest.fn().mockReturnValue(true),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricingService },
        { provide: BookingLifecycleService, useValue: lifecycleService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  describe('holdSeats concurrency safety', () => {
    it('should successfully acquire a temporary hold and return HELD booking with 5-minute expiry', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        title: 'Coldplay Concert',
        pricingStrategy: PricingStrategyType.STANDARD,
        seatTiers: [{ id: 'tier-1', name: 'VIP', basePrice: 150 }],
      });

      prisma.$executeRaw.mockResolvedValue(1);

      prisma.seat.findUnique.mockResolvedValue({
        id: 'seat-1',
        rowLabel: 'A',
        seatNumber: 1,
        seatTier: { name: 'VIP', basePrice: 150 },
      });

      prisma.booking.create.mockResolvedValue({
        id: 'booking-1',
        bookingReference: 'TF-20261122-TEST1',
        status: BookingStatus.HELD,
        totalPrice: 150,
        holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await service.holdSeats('user-1', {
        eventId: 'event-1',
        seatIds: ['seat-1'],
      });

      expect(result.status).toBe(BookingStatus.HELD);
      expect(result.totalPrice).toBe(150);
      expect(result.seats.length).toBe(1);
      expect(result.secondsRemaining).toBeGreaterThan(280);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should throw ConflictException (409) if atomic update affects 0 rows (seat already taken)', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        title: 'Coldplay Concert',
        pricingStrategy: PricingStrategyType.STANDARD,
      });

      prisma.$executeRaw.mockResolvedValue(0);

      await expect(
        service.holdSeats('user-2', {
          eventId: 'event-1',
          seatIds: ['seat-1'],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Cancellation & Refund Rule (>24h full refund vs <=24h non-refundable)', () => {
    it('should issue 100% full refund when cancelled > 24 hours before event', async () => {
      const futureEventDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h away

      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-refund-100',
        userId: 'user-1',
        bookingReference: 'TF-REFUND-100',
        totalPrice: 200.0,
        status: BookingStatus.CONFIRMED,
        bookingSeats: [{ seatId: 'seat-1' }],
        event: {
          title: 'Coldplay',
          eventDate: futureEventDate,
        },
        user: { email: 'customer@ticketflow.com' },
      });

      const result = await service.cancelBooking('user-1', 'booking-refund-100');

      expect(result.success).toBe(true);
      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(200.0);
      expect(result.status).toBe(BookingStatus.CANCELLED);

      // Verify seats restored to AVAILABLE
      expect(prisma.seat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'seat-1' },
          data: expect.objectContaining({ status: SeatStatus.AVAILABLE }),
        }),
      );

      // Verify domain event emitted (Observer Pattern)
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({
          bookingId: 'booking-refund-100',
          refundAmount: 200.0,
          refundPercentage: 100,
        }),
      );
    });

    it('should issue 0% refund when cancelled <= 24 hours before event', async () => {
      const soonEventDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h away (<24h)

      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-refund-0',
        userId: 'user-1',
        bookingReference: 'TF-REFUND-0',
        totalPrice: 200.0,
        status: BookingStatus.CONFIRMED,
        bookingSeats: [{ seatId: 'seat-1' }],
        event: {
          title: 'Coldplay',
          eventDate: soonEventDate,
        },
        user: { email: 'customer@ticketflow.com' },
      });

      const result = await service.cancelBooking('user-1', 'booking-refund-0');

      expect(result.success).toBe(true);
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0.0);
      expect(result.message).toContain('within 24 hours');

      // Still restores seats so others can attend
      expect(prisma.seat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'seat-1' },
          data: expect.objectContaining({ status: SeatStatus.AVAILABLE }),
        }),
      );
    });

    it('should throw ForbiddenException if user cancels another user booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-other',
        userId: 'user-legit',
      });

      await expect(
        service.cancelBooking('user-hacker', 'booking-other'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
