import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should fetch user notifications and unread count', async () => {
    prisma.notification.findMany.mockResolvedValue([
      { id: 'notif-1', title: 'Booking Confirmed', isRead: false },
    ]);
    prisma.notification.count.mockResolvedValue(1);

    const result = await service.getUserNotifications('user-1');

    expect(result.notifications.length).toBe(1);
    expect(result.unreadCount).toBe(1);
  });

  it('should mark single notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      isRead: false,
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notif-1',
      isRead: true,
    });

    const result = await service.markAsRead('user-1', 'notif-1');
    expect(result.isRead).toBe(true);
  });

  it('should throw NotFoundException if notification belongs to another user', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-other',
    });

    await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should mark all notifications as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 5 });

    const result = await service.markAllAsRead('user-1');
    expect(result.message).toContain('All notifications marked as read');
  });
});
