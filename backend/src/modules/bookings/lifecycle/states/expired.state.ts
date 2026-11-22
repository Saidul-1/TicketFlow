import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingState } from '../booking-state.interface';

@Injectable()
export class ExpiredState implements BookingState {
  readonly status = BookingStatus.EXPIRED;

  canTransitionTo(_targetStatus: BookingStatus): boolean {
    // Expired is a terminal state
    return false;
  }

  validateTransition(targetStatus: BookingStatus): void {
    throw new BadRequestException(
      `Illegal status transition: Expired booking is in a terminal state and cannot transition to ${targetStatus}`,
    );
  }
}
