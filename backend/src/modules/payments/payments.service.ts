import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProcessor } from './interfaces/payment-processor.interface';
import { MockStripeProcessor } from './processors/mock-stripe.processor';
import { MockPaypalProcessor } from './processors/mock-paypal.processor';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { BookingStatus, PaymentProviderType, SeatStatus } from '@prisma/client';

/**
 * Strategy Context: PaymentsService
 * Decoupled from concrete payment gateways (Strategy Pattern).
 * Implements strict payment idempotency and lifecycle state transitions.
 */
@Injectable()
export class PaymentsService {
  private processors = new Map<PaymentProviderType, PaymentProcessor>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    stripeProcessor: MockStripeProcessor,
    paypalProcessor: MockPaypalProcessor,
  ) {
    this.registerProcessor(stripeProcessor);
    this.registerProcessor(paypalProcessor);
  }

  registerProcessor(processor: PaymentProcessor) {
    this.processors.set(processor.providerType, processor);
  }

  getProcessor(type: PaymentProviderType): PaymentProcessor {
    const processor = this.processors.get(type);
    if (!processor) {
      throw new BadRequestException(`No payment processor registered for provider "${type}"`);
    }
    return processor;
  }

  async processPayment(userId: string, dto: ProcessPaymentDto) {
    // 1. Fetch booking with seats, event, and user
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        bookingSeats: true,
        event: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${dto.bookingId}" not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only make payments for your own bookings');
    }

    // 2. IDEMPOTENCY CHECK
    // If the exact same idempotency key was previously processed and confirmed, return existing result.
    if (booking.idempotencyKey === dto.idempotencyKey && booking.status === BookingStatus.CONFIRMED) {
      return {
        success: true,
        isIdempotentReplay: true,
        message: 'Payment previously processed with this idempotency key. No duplicate charge incurred.',
        bookingReference: booking.bookingReference,
        transactionId: booking.paymentId,
        provider: booking.paymentProvider,
        amount: Number(booking.totalPrice),
        status: booking.status,
      };
    }

    // 3. Status Guard Checks
    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('This booking has already been confirmed and paid');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled booking');
    }

    if (booking.status === BookingStatus.EXPIRED) {
      throw new BadRequestException('Seat hold has expired. Please select your seats again.');
    }

    // 4. Hold Expiry Verification
    const now = new Date();
    if (booking.status === BookingStatus.HELD && booking.holdExpiresAt && booking.holdExpiresAt < now) {
      // Lazy expiry: update booking to EXPIRED and release seats
      await this.prisma.$transaction(async (tx) => {
        for (const bs of booking.bookingSeats) {
          await tx.seat.update({
            where: { id: bs.seatId },
            data: { status: SeatStatus.AVAILABLE, heldByUserId: null, holdExpiresAt: null },
          });
        }
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.EXPIRED },
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.HELD,
            toStatus: BookingStatus.EXPIRED,
            reason: 'Hold window expired prior to payment completion',
          },
        });
      });

      throw new BadRequestException('Seat hold has expired. Please select your seats again.');
    }

    // 5. Delegate to Strategy Processor (Stripe or PayPal)
    const processor = this.getProcessor(dto.provider);
    const paymentResult = await processor.processPayment({
      bookingId: booking.id,
      amount: Number(booking.totalPrice),
      currency: 'USD',
      idempotencyKey: dto.idempotencyKey,
      customerEmail: booking.user.email,
    });

    if (!paymentResult.success) {
      throw new BadRequestException(`Payment failed: ${paymentResult.message}`);
    }

    // 6. Transactionally Confirm Booking & Convert Seats to BOOKED
    await this.prisma.$transaction(async (tx) => {
      // Convert held seats to BOOKED
      for (const bs of booking.bookingSeats) {
        await tx.seat.update({
          where: { id: bs.seatId },
          data: {
            status: SeatStatus.BOOKED,
            heldByUserId: null,
            holdExpiresAt: null,
          },
        });
      }

      // Update Booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentProvider: dto.provider,
          paymentId: paymentResult.transactionId,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // Audit status transition
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.HELD,
          toStatus: BookingStatus.CONFIRMED,
          reason: `Payment confirmed via ${dto.provider} (Transaction: ${paymentResult.transactionId})`,
        },
      });
    });

    // 7. Emit Domain Event (Observer Pattern)
    this.eventEmitter.emit('booking.confirmed', {
      bookingId: booking.id,
      userId: booking.userId,
      userEmail: booking.user.email,
      eventTitle: booking.event.title,
      bookingReference: booking.bookingReference,
      amount: Number(booking.totalPrice),
      provider: dto.provider,
      transactionId: paymentResult.transactionId,
    });

    return {
      success: true,
      isIdempotentReplay: false,
      message: paymentResult.message,
      bookingReference: booking.bookingReference,
      transactionId: paymentResult.transactionId,
      provider: dto.provider,
      amount: Number(booking.totalPrice),
      status: BookingStatus.CONFIRMED,
    };
  }
}
