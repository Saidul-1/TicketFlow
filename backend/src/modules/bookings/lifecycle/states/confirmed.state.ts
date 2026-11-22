import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingState } from '../booking-state.interface';

@Injectable()
export class ConfirmedState implements BookingState {
  readonly status = BookingStatus.CONFIRMED;

  canTransitionTo(targetStatus: BookingStatus): boolean {
    // A confirmed booking can only transition to CANCELLED (via refund rule)
    return targetStatus === BookingStatus.CANCELLED;
  }

  validateTransition(targetStatus: BookingStatus): void {
    if (!this.canTransitionTo(targetStatus)) {
      throw new BadRequestException(
        `Illegal status transition: Confirmed booking can only transition to CANCELLED, not ${targetStatus}`,
      );
    }
  }
}
