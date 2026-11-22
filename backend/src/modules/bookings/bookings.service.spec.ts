import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BookingStatus, PricingStrategyType } from '@prisma/client';

describe('BookingsService - Concurrency & Holds', () => {
  let service: BookingsService;
  let prisma: any;
  let pricingService: any;

  beforeEach(async () => {
    prisma = {
      event: {
        findUnique: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
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
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    pricingService = {
      calculatePrice: jest.fn((type, basePrice) => basePrice),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricingService },
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

      // Atomic conditional update affects 1 row -> lock acquired!
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

      // Atomic update affected 0 rows -> conflict / race condition caught!
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(
        service.holdSeats('user-2', {
          eventId: 'event-1',
          seatIds: ['seat-1'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.holdSeats('user-1', {
          eventId: 'non-existent',
          seatIds: ['seat-1'],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseHold', () => {
    it('should release held seats and transition booking to EXPIRED', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-1',
        status: BookingStatus.HELD,
        bookingSeats: [{ seatId: 'seat-1' }],
      });

      const result = await service.releaseHold('user-1', 'booking-1');

      expect(result.message).toContain('Hold successfully released');
      expect(prisma.seat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'seat-1' },
          data: expect.objectContaining({ status: 'AVAILABLE' }),
        }),
      );
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: BookingStatus.EXPIRED },
        }),
      );
    });

    it('should throw ForbiddenException if user attempts to release another user hold', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-owner',
        status: BookingStatus.HELD,
      });

      await expect(
        service.releaseHold('user-intruder', 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking is not in HELD status', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-1',
        status: BookingStatus.CONFIRMED,
      });

      await expect(
        service.releaseHold('user-1', 'booking-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
