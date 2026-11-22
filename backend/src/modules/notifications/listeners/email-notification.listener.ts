import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BookingConfirmedEvent } from '../events/booking-confirmed.event';
import { BookingCancelledEvent } from '../events/booking-cancelled.event';

/**
 * Observer Pattern: Concrete Observer 1 (Email Channel)
 * Handles asynchronous email notifications without touching core booking logic.
 */
@Injectable()
export class EmailNotificationListener {
  private readonly logger = new Logger('EmailNotificationService');

  @OnEvent('booking.confirmed')
  handleBookingConfirmed(event: BookingConfirmedEvent) {
    this.logger.log(`
===================== 📧 OUTBOUND EMAIL SIMULATOR =====================
TO:      ${event.userEmail}
SUBJECT: Booking Confirmation - ${event.eventTitle} (${event.bookingReference})
BODY:
  Dear Customer,
  Your tickets for "${event.eventTitle}" have been successfully confirmed!
  - Booking Reference: ${event.bookingReference}
  - Total Charged:     $${event.amount.toFixed(2)}
  - Payment Provider:  ${event.provider}
  - Transaction ID:    ${event.transactionId}
  Thank you for choosing TicketFlow.
=======================================================================
    `);
  }

  @OnEvent('booking.cancelled')
  handleBookingCancelled(event: BookingCancelledEvent) {
    this.logger.log(`
===================== 📧 OUTBOUND EMAIL SIMULATOR =====================
TO:      ${event.userEmail}
SUBJECT: Booking Cancellation & Refund Notice (${event.bookingReference})
BODY:
  Dear Customer,
  Your booking (${event.bookingReference}) for "${event.eventTitle}" has been cancelled.
  - Refund Status:     ${event.refundPercentage}% Refund Issued
  - Refund Amount:     $${event.refundAmount.toFixed(2)}
  The refunded amount will appear in your original payment method within 3-5 days.
=======================================================================
    `);
  }
}
