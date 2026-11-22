import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingState } from '../booking-state.interface';

@Injectable()
export class PendingPaymentState implements BookingState {
  readonly status = BookingStatus.PENDING_PAYMENT;

  canTransitionTo(targetStatus: BookingStatus): boolean {
    const validTransitions: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.EXPIRED,
      BookingStatus.CANCELLED,
    ];
    return validTransitions.includes(targetStatus);
  }

  validateTransition(targetStatus: BookingStatus): void {
    if (!this.canTransitionTo(targetStatus)) {
      throw new BadRequestException(
        `Illegal status transition: Cannot transition booking from ${this.status} to ${targetStatus}`,
      );
    }
  }
}
