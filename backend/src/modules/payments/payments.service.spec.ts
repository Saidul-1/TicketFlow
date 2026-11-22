import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MockStripeProcessor } from './processors/mock-stripe.processor';
import { MockPaypalProcessor } from './processors/mock-paypal.processor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentProviderType, SeatStatus } from '@prisma/client';

describe('PaymentsService - Strategy Pattern & Idempotency', () => {
  let service: PaymentsService;
  let prisma: any;
  let eventEmitter: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bookingStatusHistory: {
        create: jest.fn(),
      },
      seat: {
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        MockStripeProcessor,
        MockPaypalProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('Strategy Switching: Stripe vs PayPal', () => {
    const validBooking = {
      id: 'booking-1',
      userId: 'user-1',
      bookingReference: 'TF-20261122-XYZ1',
      totalPrice: 150.0,
      status: BookingStatus.HELD,
      holdExpiresAt: new Date(Date.now() + 180 * 1000), // 3 min remaining
      bookingSeats: [{ seatId: 'seat-1' }],
      event: { title: 'Coldplay Concert' },
      user: { email: 'customer@ticketflow.com' },
      idempotencyKey: null,
    };

    it('should process payment via MockStripe strategy and confirm booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(validBooking);

      const result = await service.processPayment('user-1', {
        bookingId: 'booking-1',
        provider: PaymentProviderType.MOCK_STRIPE,
        idempotencyKey: 'idem-key-stripe-001',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(PaymentProviderType.MOCK_STRIPE);
      expect(result.transactionId).toMatch(/^ch_stripe_mock_/);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.isIdempotentReplay).toBe(false);

      // Verify seats marked BOOKED
      expect(prisma.seat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'seat-1' },
          data: expect.objectContaining({ status: SeatStatus.BOOKED }),
        }),
      );

      // Verify domain event emitted (Observer Pattern)
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'booking.confirmed',
        expect.objectContaining({
          bookingId: 'booking-1',
          bookingReference: 'TF-20261122-XYZ1',
        }),
      );
    });

    it('should process payment via MockPayPal strategy without changing any booking code', async () => {
      prisma.booking.findUnique.mockResolvedValue(validBooking);

      const result = await service.processPayment('user-1', {
        bookingId: 'booking-1',
        provider: PaymentProviderType.MOCK_PAYPAL,
        idempotencyKey: 'idem-key-paypal-002',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(PaymentProviderType.MOCK_PAYPAL);
      expect(result.transactionId).toMatch(/^PAYPAL-MOCK-/);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('Payment Idempotency', () => {
    it('should return cached transaction without re-charging when idempotencyKey matches previous run', async () => {
      const alreadyConfirmedBooking = {
        id: 'booking-1',
        userId: 'user-1',
        bookingReference: 'TF-20261122-XYZ1',
        totalPrice: 150.0,
        status: BookingStatus.CONFIRMED,
        paymentProvider: PaymentProviderType.MOCK_STRIPE,
        paymentId: 'ch_stripe_mock_original_123',
        idempotencyKey: 'idem-key-repeat-777',
        bookingSeats: [],
        event: { title: 'Coldplay Concert' },
        user: { email: 'customer@ticketflow.com' },
      };

      prisma.booking.findUnique.mockResolvedValue(alreadyConfirmedBooking);

      const result = await service.processPayment('user-1', {
        bookingId: 'booking-1',
        provider: PaymentProviderType.MOCK_STRIPE,
        idempotencyKey: 'idem-key-repeat-777',
      });

      // Assert idempotent replay
      expect(result.isIdempotentReplay).toBe(true);
      expect(result.transactionId).toBe('ch_stripe_mock_original_123');
      expect(result.message).toContain('No duplicate charge incurred');

      // Crucial: ensure no new database writes occurred
      expect(prisma.seat.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('Hold Expiration & Guards', () => {
    it('should throw BadRequestException and release seats if hold has expired', async () => {
      const expiredBooking = {
        id: 'booking-1',
        userId: 'user-1',
        bookingReference: 'TF-20261122-XYZ1',
        totalPrice: 150.0,
        status: BookingStatus.HELD,
        holdExpiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        bookingSeats: [{ seatId: 'seat-1' }],
        event: { title: 'Coldplay Concert' },
        user: { email: 'customer@ticketflow.com' },
        idempotencyKey: null,
      };

      prisma.booking.findUnique.mockResolvedValue(expiredBooking);

      await expect(
        service.processPayment('user-1', {
          bookingId: 'booking-1',
          provider: PaymentProviderType.MOCK_STRIPE,
          idempotencyKey: 'idem-key-new',
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify seats were reset to AVAILABLE
      expect(prisma.seat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'seat-1' },
          data: expect.objectContaining({ status: SeatStatus.AVAILABLE }),
        }),
      );
    });

    it('should throw ForbiddenException if user tries to pay for someone else booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-owner',
      });

      await expect(
        service.processPayment('user-intruder', {
          bookingId: 'booking-1',
          provider: PaymentProviderType.MOCK_STRIPE,
          idempotencyKey: 'idem-key-hack',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
