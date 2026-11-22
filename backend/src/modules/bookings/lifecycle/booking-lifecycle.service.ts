import { Injectable, BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingState } from './booking-state.interface';
import { HeldState } from './states/held.state';
import { PendingPaymentState } from './states/pending-payment.state';
import { ConfirmedState } from './states/confirmed.state';
import { ExpiredState } from './states/expired.state';
import { CancelledState } from './states/cancelled.state';

/**
 * State Pattern Context: BookingLifecycleService
 * Resolves current state object and validates state machine transitions.
 */
@Injectable()
export class BookingLifecycleService {
  private states = new Map<BookingStatus, BookingState>();

  constructor(
    heldState: HeldState,
    pendingPaymentState: PendingPaymentState,
    confirmedState: ConfirmedState,
    expiredState: ExpiredState,
    cancelledState: CancelledState,
  ) {
    this.states.set(BookingStatus.HELD, heldState);
    this.states.set(BookingStatus.PENDING_PAYMENT, pendingPaymentState);
    this.states.set(BookingStatus.CONFIRMED, confirmedState);
    this.states.set(BookingStatus.EXPIRED, expiredState);
    this.states.set(BookingStatus.CANCELLED, cancelledState);
  }

  getState(status: BookingStatus): BookingState {
    const state = this.states.get(status);
    if (!state) {
      throw new BadRequestException(`Unknown booking status "${status}"`);
    }
    return state;
  }

  canTransition(currentStatus: BookingStatus, targetStatus: BookingStatus): boolean {
    const state = this.getState(currentStatus);
    return state.canTransitionTo(targetStatus);
  }

  validateTransition(currentStatus: BookingStatus, targetStatus: BookingStatus): void {
    const state = this.getState(currentStatus);
    state.validateTransition(targetStatus);
  }
}
