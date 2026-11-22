import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { HoldSeatsDto } from './dto/hold-seats.dto';
import { BookingResponseDto, BookingSeatItemDto } from './dto/booking-response.dto';
import { BookingStatus, Prisma, SeatStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  /**
   * Concurrency-Safe Temporary Seat Hold
   * Employs PostgreSQL row-level atomic conditional updates.
   * Prevents race conditions and guarantees zero double-booking.
   */
  async holdSeats(userId: string, dto: HoldSeatsDto): Promise<BookingResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: { seatTiers: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${dto.eventId}" not found`);
    }

    const holdDurationMinutes = 5;
    const holdExpiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const heldSeatsDetails: BookingSeatItemDto[] = [];
      let totalPrice = 0;

      for (const seatId of dto.seatIds) {
        // ATOMIC CONDITIONAL UPDATE:
        // Updates the seat status to 'HELD' ONLY if it is currently 'AVAILABLE'
        // OR if it was previously 'HELD' and its hold has expired (NOW() > holdExpiresAt).
        // PostgreSQL executes this atomically with row-level locks.
        const affectedRows: number = await tx.$executeRaw`
          UPDATE "Seat"
          SET 
            "status" = 'HELD',
            "heldByUserId" = ${userId},
            "holdExpiresAt" = ${holdExpiresAt},
            "version" = "version" + 1
          WHERE "id" = ${seatId}
            AND "eventId" = ${dto.eventId}
            AND (
              "status" = 'AVAILABLE' 
              OR ("status" = 'HELD' AND "holdExpiresAt" < NOW())
            )
        `;

        // If affectedRows is 0, another concurrent transaction acquired the seat or it's booked
        if (affectedRows === 0) {
          throw new ConflictException(
            `Seat with ID "${seatId}" is currently reserved or booked by another user. Please choose another seat.`,
          );
        }

        const seat = await tx.seat.findUnique({
          where: { id: seatId },
          include: { seatTier: true },
        });

        if (seat) {
          const rawPrice = Number(seat.seatTier.basePrice);
          const price = this.pricingService.calculatePrice(
            event.pricingStrategy,
            rawPrice,
            event.eventDate,
            new Date(),
          );
          totalPrice += price;
          heldSeatsDetails.push({
            seatId: seat.id,
            rowLabel: seat.rowLabel,
            seatNumber: seat.seatNumber,
            tierName: seat.seatTier.name,
            price,
          });
        }
      }

      // Generate unique booking reference: e.g. TF-YYYYMMDD-XXXX
      const refCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const bookingReference = `TF-${dateStr}-${refCode}`;

      // Initialize Booking record in HELD state
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          eventId: event.id,
          userId,
          status: BookingStatus.HELD,
          totalPrice: new Prisma.Decimal(totalPrice),
          pricingStrategyUsed: event.pricingStrategy,
          holdExpiresAt,
          bookingSeats: {
            create: heldSeatsDetails.map((s) => ({
              seatId: s.seatId,
              priceCharged: new Prisma.Decimal(s.price),
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: BookingStatus.HELD,
              reason: 'Temporary seat hold acquired (5-minute reservation window)',
            },
          },
        },
      });

      const secondsRemaining = Math.max(
        0,
        Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000),
      );

      return {
        id: booking.id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        eventId: event.id,
        eventTitle: event.title,
        totalPrice,
        holdExpiresAt,
        secondsRemaining,
        seats: heldSeatsDetails,
      };
    });
  }

  /**
   * Release hold manually before expiration
   */
  async releaseHold(userId: string, bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { bookingSeats: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID "${bookingId}" not found`);
      }

      if (booking.userId !== userId) {
        throw new ForbiddenException('You can only release your own held seats');
      }

      if (booking.status !== BookingStatus.HELD) {
        throw new BadRequestException(
          `Cannot release hold for booking in status "${booking.status}". Only HELD bookings can be released.`,
        );
      }

      // Mark seats as AVAILABLE
      for (const bs of booking.bookingSeats) {
        await tx.seat.update({
          where: { id: bs.seatId },
          data: {
            status: SeatStatus.AVAILABLE,
            heldByUserId: null,
            holdExpiresAt: null,
          },
        });
      }

      // Update Booking status to EXPIRED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.EXPIRED },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.HELD,
          toStatus: BookingStatus.EXPIRED,
          reason: 'Hold voluntarily released by user prior to payment',
        },
      });

      return { message: 'Hold successfully released and seats made available' };
    });
  }

  /**
   * Retrieve single booking by ID with ownership check
   */
  async getBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        bookingSeats: {
          include: {
            seat: {
              include: { seatTier: true },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${bookingId}" not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    const now = new Date();
    const secondsRemaining =
      booking.status === BookingStatus.HELD && booking.holdExpiresAt
        ? Math.max(0, Math.floor((booking.holdExpiresAt.getTime() - now.getTime()) / 1000))
        : 0;

    return {
      ...booking,
      totalPrice: Number(booking.totalPrice),
      refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
      secondsRemaining,
    };
  }

  /**
   * Retrieve all bookings for the authenticated customer
   */
  async getUserBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            city: true,
            eventDate: true,
          },
        },
        bookingSeats: {
          include: {
            seat: {
              select: {
                id: true,
                rowLabel: true,
                seatNumber: true,
                seatTier: { select: { name: true } },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const now = new Date();
    return bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      refundAmount: b.refundAmount ? Number(b.refundAmount) : null,
      secondsRemaining:
        b.status === BookingStatus.HELD && b.holdExpiresAt
          ? Math.max(0, Math.floor((b.holdExpiresAt.getTime() - now.getTime()) / 1000))
          : 0,
    }));
  }
}
