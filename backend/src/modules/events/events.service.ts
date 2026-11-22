import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { SeatMapResponseDto, SeatMapItemDto } from './dto/seat-map-response.dto';
import { Prisma, SeatStatus } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async createEvent(organizerId: string, dto: CreateEventDto) {
    // 1. Validate tiers coverage
    this.validateSeatTiers(dto.totalRows, dto.tiers);

    return this.prisma.$transaction(async (tx) => {
      // 2. Create Event
      const event = await tx.event.create({
        data: {
          organizerId,
          title: dto.title,
          description: dto.description,
          venue: dto.venue,
          city: dto.city,
          eventDate: new Date(dto.eventDate),
          pricingStrategy: dto.pricingStrategy,
          totalRows: dto.totalRows,
          seatsPerRow: dto.seatsPerRow,
        },
      });

      // 3. Create Seat Tiers
      const createdTiers = [];
      for (const tier of dto.tiers) {
        const createdTier = await tx.seatTier.create({
          data: {
            eventId: event.id,
            name: tier.name,
            basePrice: new Prisma.Decimal(tier.basePrice),
            fromRow: tier.fromRow,
            toRow: tier.toRow,
          },
        });
        createdTiers.push(createdTier);
      }

      // 4. Generate Seats Grid (Rows A..Z, Cols 1..seatsPerRow)
      const seatsData = [];
      for (let r = 1; r <= dto.totalRows; r++) {
        const rowLabel = String.fromCharCode(64 + r); // 1 -> 'A', 2 -> 'B'
        const matchingTier = createdTiers.find(
          (t) => r >= t.fromRow && r <= t.toRow,
        );

        if (!matchingTier) {
          throw new BadRequestException(`No seat tier defined for row ${rowLabel}`);
        }

        for (let s = 1; s <= dto.seatsPerRow; s++) {
          seatsData.push({
            eventId: event.id,
            seatTierId: matchingTier.id,
            rowLabel,
            seatNumber: s,
            status: SeatStatus.AVAILABLE,
            version: 0,
          });
        }
      }

      await tx.seat.createMany({
        data: seatsData,
      });

      return {
        ...event,
        tiers: createdTiers,
        totalSeatsGenerated: seatsData.length,
      };
    });
  }

  async findAll(query: EventQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    if (query.city) {
      where.city = { equals: query.city, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.eventDate = {};
      if (query.startDate) {
        where.eventDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.eventDate.lte = new Date(query.endDate);
      }
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventDate: 'asc' },
        include: {
          seatTiers: {
            select: {
              id: true,
              name: true,
              basePrice: true,
            },
          },
          _count: {
            select: {
              seats: true,
              bookings: true,
            },
          },
        },
      }),
    ]);

    const formattedEvents = events.map((event) => {
      const prices = event.seatTiers.map((t) => Number(t.basePrice));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      return {
        ...event,
        startingPrice: minPrice,
      };
    });

    return {
      data: formattedEvents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        seatTiers: {
          orderBy: { fromRow: 'asc' },
        },
        organizer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    const prices = event.seatTiers.map((t) => Number(t.basePrice));
    const startingPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      ...event,
      startingPrice,
    };
  }

  async findOrganizerEvents(organizerId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      include: {
        seatTiers: true,
        _count: {
          select: {
            seats: true,
            bookings: true,
          },
        },
      },
    });

    return events;
  }

  async updateEvent(organizerId: string, eventId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    // Enforce Rule: Organizers can only manage their own events
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only manage your own events');
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        venue: dto.venue,
        city: dto.city,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        pricingStrategy: dto.pricingStrategy,
      },
      include: {
        seatTiers: true,
      },
    });
  }

  async deleteEvent(organizerId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    // Enforce Rule: Organizers can only manage their own events
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only manage your own events');
    }

    await this.prisma.event.delete({
      where: { id: eventId },
    });

    return { message: 'Event successfully deleted' };
  }

  async getSeatMap(eventId: string, currentUserId?: string): Promise<SeatMapResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        seatTiers: true,
        seats: {
          include: {
            seatTier: true,
          },
          orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    const now = new Date();

    const formattedSeats: SeatMapItemDto[] = event.seats.map((seat) => {
      let effectiveStatus = seat.status;
      let secondsRemaining = 0;
      let isHeldByMe = false;

      // Lazy hold expiration evaluation
      if (seat.status === SeatStatus.HELD) {
        if (seat.holdExpiresAt && seat.holdExpiresAt < now) {
          // Expired! Treat dynamically as AVAILABLE
          effectiveStatus = SeatStatus.AVAILABLE;
        } else {
          // Still active hold
          secondsRemaining = seat.holdExpiresAt
            ? Math.max(0, Math.floor((seat.holdExpiresAt.getTime() - now.getTime()) / 1000))
            : 0;
          isHeldByMe = currentUserId ? seat.heldByUserId === currentUserId : false;
        }
      }

      return {
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        tierId: seat.seatTierId,
        tierName: seat.seatTier.name,
        basePrice: Number(seat.seatTier.basePrice),
        status: effectiveStatus,
        isHeldByMe,
        secondsRemaining,
      };
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      totalRows: event.totalRows,
      seatsPerRow: event.seatsPerRow,
      seats: formattedSeats,
    };
  }

  private validateSeatTiers(totalRows: number, tiers: { fromRow: number; toRow: number }[]) {
    if (!tiers || tiers.length === 0) {
      throw new BadRequestException('At least one seat tier must be defined');
    }

    for (const tier of tiers) {
      if (tier.fromRow > tier.toRow) {
        throw new BadRequestException(
          `Invalid tier range: fromRow (${tier.fromRow}) cannot exceed toRow (${tier.toRow})`,
        );
      }
      if (tier.fromRow < 1 || tier.toRow > totalRows) {
        throw new BadRequestException(
          `Tier rows must be between 1 and totalRows (${totalRows})`,
        );
      }
    }
  }
}
