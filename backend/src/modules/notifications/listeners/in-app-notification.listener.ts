import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingConfirmedEvent } from '../events/booking-confirmed.event';
import { BookingCancelledEvent } from '../events/booking-cancelled.event';
import { NotificationType } from '@prisma/client';

/**
 * Observer Pattern: Concrete Observer 2 (In-App Store Channel)
 * Persists domain notifications to the database for the frontend bell center.
 */
@Injectable()
export class InAppNotificationListener {
  private readonly logger = new Logger('InAppNotificationService');

  constructor(private prisma: PrismaService) {}

  @OnEvent('booking.confirmed')
  async handleBookingConfirmed(event: BookingConfirmedEvent) {
    try {
      await this.prisma.notification.create({
        data: {
          userId: event.userId,
          title: `Booking Confirmed: ${event.eventTitle}`,
          message: `Your booking (${event.bookingReference}) has been confirmed! Total paid: $${event.amount.toFixed(2)} via ${event.provider}.`,
          type: NotificationType.BOOKING_CONFIRMED,
          isRead: false,
        },
      });
      this.logger.log(`In-app notification saved for user ${event.userId}`);
    } catch (error) {
      this.logger.error('Failed to create in-app confirmation notification:', error);
    }
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: BookingCancelledEvent) {
    try {
      const refundText =
        event.refundAmount > 0
          ? `Full refund of $${event.refundAmount.toFixed(2)} (${event.refundPercentage}%) issued.`
          : 'Non-refundable (cancelled under 24 hours before the event).';

      await this.prisma.notification.create({
        data: {
          userId: event.userId,
          title: `Booking Cancelled: ${event.eventTitle}`,
          message: `Your booking (${event.bookingReference}) was cancelled. ${refundText}`,
          type: NotificationType.BOOKING_CANCELLED,
          isRead: false,
        },
      });
      this.logger.log(`In-app cancellation notification saved for user ${event.userId}`);
    } catch (error) {
      this.logger.error('Failed to create in-app cancellation notification:', error);
    }
  }
}
