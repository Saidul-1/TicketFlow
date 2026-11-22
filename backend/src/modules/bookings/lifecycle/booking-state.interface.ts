import { BookingStatus } from '@prisma/client';

/**
 * State Pattern Interface: Booking Lifecycle
 * Enforces valid finite state machine transitions:
 * Held -> Pending Payment -> Confirmed / Expired / Cancelled.
 */
export interface BookingState {
  readonly status: BookingStatus;
  canTransitionTo(targetStatus: BookingStatus): boolean;
  validateTransition(targetStatus: BookingStatus): void;
}
