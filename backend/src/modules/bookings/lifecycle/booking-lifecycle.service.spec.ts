import { BookingLifecycleService } from './booking-lifecycle.service';
import { HeldState } from './states/held.state';
import { PendingPaymentState } from './states/pending-payment.state';
import { ConfirmedState } from './states/confirmed.state';
import { ExpiredState } from './states/expired.state';
import { CancelledState } from './states/cancelled.state';
import { BookingStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('BookingLifecycleService - State Pattern Implementation', () => {
  let lifecycleService: BookingLifecycleService;

  beforeEach(() => {
    const held = new HeldState();
    const pending = new PendingPaymentState();
    const confirmed = new ConfirmedState();
    const expired = new ExpiredState();
    const cancelled = new CancelledState();

    lifecycleService = new BookingLifecycleService(
      held,
      pending,
      confirmed,
      expired,
      cancelled,
    );
  });

  describe('Valid State Transitions', () => {
    it('should allow HELD -> CONFIRMED', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.HELD, BookingStatus.CONFIRMED),
      ).toBe(true);
      expect(() =>
        lifecycleService.validateTransition(BookingStatus.HELD, BookingStatus.CONFIRMED),
      ).not.toThrow();
    });

    it('should allow HELD -> EXPIRED', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.HELD, BookingStatus.EXPIRED),
      ).toBe(true);
    });

    it('should allow HELD -> CANCELLED', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.HELD, BookingStatus.CANCELLED),
      ).toBe(true);
    });

    it('should allow CONFIRMED -> CANCELLED', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
      ).toBe(true);
      expect(() =>
        lifecycleService.validateTransition(
          BookingStatus.CONFIRMED,
          BookingStatus.CANCELLED,
        ),
      ).not.toThrow();
    });
  });

  describe('Illegal State Transitions (Guards)', () => {
    it('should reject CONFIRMED -> HELD', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.CONFIRMED, BookingStatus.HELD),
      ).toBe(false);
      expect(() =>
        lifecycleService.validateTransition(
          BookingStatus.CONFIRMED,
          BookingStatus.HELD,
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject EXPIRED -> CONFIRMED', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.EXPIRED, BookingStatus.CONFIRMED),
      ).toBe(false);
      expect(() =>
        lifecycleService.validateTransition(
          BookingStatus.EXPIRED,
          BookingStatus.CONFIRMED,
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject CANCELLED -> CONFIRMED', () => {
      expect(
        lifecycleService.canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED),
      ).toBe(false);
      expect(() =>
        lifecycleService.validateTransition(
          BookingStatus.CANCELLED,
          BookingStatus.CONFIRMED,
        ),
      ).toThrow(BadRequestException);
    });
  });
});
