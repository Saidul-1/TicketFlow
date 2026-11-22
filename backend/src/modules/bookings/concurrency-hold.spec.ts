import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { BookingLifecycleService } from './lifecycle/booking-lifecycle.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';
import { BookingStatus, PricingStrategyType } from '@prisma/client';

describe('Concurrency Simulation - Zero Double-Booking Guarantee', () => {
  let service: BookingsService;

  it('should ensure exactly ONE user acquires the hold when 10 concurrent requests target the same seat', async () => {
    // Shared simulated atomic row state in memory
    let isSeatHeld = false;

    const mockPrisma = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'event-concurrency',
          title: 'High-Demand Concert',
          pricingStrategy: PricingStrategyType.STANDARD,
          seatTiers: [{ id: 'tier-1', name: 'Front Row', basePrice: 200 }],
        }),
      },
      seat: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'seat-contested',
          rowLabel: 'A',
          seatNumber: 1,
          seatTier: { name: 'Front Row', basePrice: 200 },
        }),
      },
      booking: {
        create: jest.fn().mockImplementation((args) => ({
          id: `booking-${Math.random()}`,
          bookingReference: `TF-CONCUR-${Math.random()}`,
          status: BookingStatus.HELD,
          totalPrice: 200,
          holdExpiresAt: args.data.holdExpiresAt,
        })),
      },
      bookingStatusHistory: {
        create: jest.fn(),
      },
      // Atomic conditional update simulation:
      // In PostgreSQL, row-level locks serialize this. If already held and not expired, 0 rows affected.
      $executeRaw: jest.fn().mockImplementation(async () => {
        if (!isSeatHeld) {
          isSeatHeld = true; // First concurrent request takes it
          return 1; // 1 row updated
        }
        return 0; // Contested: 0 rows updated
      }),
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    const mockPricingService = {
      calculatePrice: jest.fn((type, basePrice) => basePrice),
    };

    const mockLifecycleService = {
      validateTransition: jest.fn(),
      canTransition: jest.fn().mockReturnValue(true),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PricingService, useValue: mockPricingService },
        { provide: BookingLifecycleService, useValue: mockLifecycleService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);

    // Simulate 10 simultaneous user requests firing at the exact same millisecond
    const userIds = Array.from({ length: 10 }, (_, i) => `user-${i + 1}`);

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        service.holdSeats(userId, {
          eventId: 'event-concurrency',
          seatIds: ['seat-contested'],
        }),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Strict validation
    expect(successful.length).toBe(1);
    expect(rejected.length).toBe(9);

    // Verify all 9 rejected attempts failed with ConflictException (409)
    rejected.forEach((r: any) => {
      expect(r.reason).toBeInstanceOf(ConflictException);
      expect(r.reason.message).toContain('currently reserved or booked by another user');
    });
  });
});
