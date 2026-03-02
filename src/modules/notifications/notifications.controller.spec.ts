import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const notificationsServiceMock = {
    findAllForUser: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: notificationsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll should use user payload', async () => {
    const expected = [{ id: 1 }];
    notificationsServiceMock.findAllForUser.mockResolvedValue(expected);

    const result = await controller.findAll({ userId: 7 } as any);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.findAllForUser).toHaveBeenCalledWith(7);
  });

  it('markRead should use user payload', async () => {
    const expected = { updated: 1 };
    notificationsServiceMock.markRead.mockResolvedValue(expected);

    const result = await controller.markRead('5', { userId: 8 } as any);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.markRead).toHaveBeenCalledWith(5, 8);
  });

  it('markAllRead should use user payload', async () => {
    const expected = { updated: 3 };
    notificationsServiceMock.markAllRead.mockResolvedValue(expected);

    const result = await controller.markAllRead({ userId: 8 } as any);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.markAllRead).toHaveBeenCalledWith(8);
  });

  it('remove should use user payload', async () => {
    const expected = { deleted: 1 };
    notificationsServiceMock.remove.mockResolvedValue(expected);

    const result = await controller.remove('6', { userId: 9 } as any);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.remove).toHaveBeenCalledWith(6, 9);
  });

  it('removeAll should use user payload', async () => {
    const expected = { deleted: 5 };
    notificationsServiceMock.removeAll.mockResolvedValue(expected);

    const result = await controller.removeAll({ userId: 9 } as any);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.removeAll).toHaveBeenCalledWith(9);
  });
});
