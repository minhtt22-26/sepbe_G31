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
});
