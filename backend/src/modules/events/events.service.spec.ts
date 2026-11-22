import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PricingStrategyType, SeatStatus } from '@prisma/client';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      event: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      seatTier: {
        create: jest.fn(),
      },
      seat: {
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('createEvent validation', () => {
    it('should throw BadRequestException if tier fromRow > toRow', async () => {
      await expect(
        service.createEvent('org-1', {
          title: 'Test Concert',
          description: 'Desc',
          venue: 'Arena',
          city: 'Dhaka',
          eventDate: new Date().toISOString(),
          pricingStrategy: PricingStrategyType.STANDARD,
          totalRows: 5,
          seatsPerRow: 8,
          tiers: [{ name: 'Invalid', basePrice: 100, fromRow: 4, toRow: 2 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if tier toRow exceeds totalRows', async () => {
      await expect(
        service.createEvent('org-1', {
          title: 'Test Concert',
          description: 'Desc',
          venue: 'Arena',
          city: 'Dhaka',
          eventDate: new Date().toISOString(),
          pricingStrategy: PricingStrategyType.STANDARD,
          totalRows: 5,
          seatsPerRow: 8,
          tiers: [{ name: 'Too Big', basePrice: 100, fromRow: 1, toRow: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ownership enforcement', () => {
    it('should throw ForbiddenException if organizer tries to update someone else event', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'org-original',
      });

      await expect(
        service.updateEvent('org-intruder', 'event-1', { title: 'Hacked Title' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if organizer tries to delete someone else event', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'org-original',
      });

      await expect(
        service.deleteEvent('org-intruder', 'event-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if event does not exist on update', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.updateEvent('org-1', 'non-existent', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSeatMap & lazy hold expiration', () => {
    it('should dynamically return AVAILABLE if a held seat has expired', async () => {
      const pastExpiry = new Date(Date.now() - 1000 * 60); // Expired 1 minute ago

      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        title: 'Coldplay',
        totalRows: 1,
        seatsPerRow: 2,
        seatTiers: [{ id: 'tier-1', name: 'VIP', basePrice: 100 }],
        seats: [
          {
            id: 'seat-1',
            rowLabel: 'A',
            seatNumber: 1,
            seatTierId: 'tier-1',
            seatTier: { name: 'VIP', basePrice: 100 },
            status: SeatStatus.HELD,
            heldByUserId: 'user-other',
            holdExpiresAt: pastExpiry,
          },
        ],
      });

      const result = await service.getSeatMap('event-1', 'user-current');
      expect(result.seats[0].status).toBe(SeatStatus.AVAILABLE);
      expect(result.seats[0].isHeldByMe).toBe(false);
      expect(result.seats[0].secondsRemaining).toBe(0);
    });

    it('should return HELD and secondsRemaining if hold is still active', async () => {
      const futureExpiry = new Date(Date.now() + 1000 * 180); // 3 minutes remaining

      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        title: 'Coldplay',
        totalRows: 1,
        seatsPerRow: 2,
        seatTiers: [{ id: 'tier-1', name: 'VIP', basePrice: 100 }],
        seats: [
          {
            id: 'seat-1',
            rowLabel: 'A',
            seatNumber: 1,
            seatTierId: 'tier-1',
            seatTier: { name: 'VIP', basePrice: 100 },
            status: SeatStatus.HELD,
            heldByUserId: 'user-current',
            holdExpiresAt: futureExpiry,
          },
        ],
      });

      const result = await service.getSeatMap('event-1', 'user-current');
      expect(result.seats[0].status).toBe(SeatStatus.HELD);
      expect(result.seats[0].isHeldByMe).toBe(true);
      expect(result.seats[0].secondsRemaining).toBeGreaterThan(170);
    });
  });
});
