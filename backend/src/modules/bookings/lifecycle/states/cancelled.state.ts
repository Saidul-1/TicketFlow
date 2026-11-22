import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingState } from '../booking-state.interface';

@Injectable()
export class CancelledState implements BookingState {
  readonly status = BookingStatus.CANCELLED;

  canTransitionTo(_targetStatus: BookingStatus): boolean {
    // Cancelled is a terminal state
    return false;
  }

  validateTransition(targetStatus: BookingStatus): void {
    throw new BadRequestException(
      `Illegal status transition: Cancelled booking is in a terminal state and cannot transition to ${targetStatus}`,
    );
  }
}
