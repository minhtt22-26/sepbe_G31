import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from 'src/prisma.service';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const prismaMock = {
  notification: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAllForUser should return notifications', async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    prismaMock.notification.findMany.mockResolvedValue(expected);

    const result = await service.findAllForUser(3);

    expect(result).toBe(expected);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 3 },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('markRead should throw when not found', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markRead(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('markRead should update', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.markRead(1, 2);

    expect(result).toEqual({ updated: 1 });
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
      data: { isRead: true },
    });
  });

  it('markAllRead should update only unread notifications by user', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 4 });

    const result = await service.markAllRead(2);

    expect(result).toEqual({ updated: 4 });
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 2, isRead: false },
      data: { isRead: true },
    });
  });

  it('remove should throw when not found', async () => {
    prismaMock.notification.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove should delete notification', async () => {
    prismaMock.notification.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.remove(1, 2);

    expect(result).toEqual({ deleted: 1 });
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
    });
  });

  it('removeAll should delete notifications by user', async () => {
    prismaMock.notification.deleteMany.mockResolvedValue({ count: 6 });

    const result = await service.removeAll(2);

    expect(result).toEqual({ deleted: 6 });
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 2 },
    });
  });
});
