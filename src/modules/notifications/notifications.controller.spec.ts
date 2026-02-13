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

  it('findAll should use user from request', async () => {
    const expected = [{ id: 1 }];
    notificationsServiceMock.findAllForUser.mockResolvedValue(expected);

    const req = { user: { id: 7 } } as any;
    const result = await controller.findAll(req);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.findAllForUser).toHaveBeenCalledWith(7);
  });

  it('findAll should fallback to userId 1', async () => {
    const expected = [{ id: 2 }];
    notificationsServiceMock.findAllForUser.mockResolvedValue(expected);

    const req = {} as any;
    const result = await controller.findAll(req);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.findAllForUser).toHaveBeenCalledWith(1);
  });

  it('markRead should use user from request', async () => {
    const expected = { updated: 1 };
    notificationsServiceMock.markRead.mockResolvedValue(expected);

    const req = { user: { id: 8 } } as any;
    const result = await controller.markRead('5', req);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.markRead).toHaveBeenCalledWith(5, 8);
  });

  it('markRead should fallback to userId 1', async () => {
    const expected = { updated: 1 };
    notificationsServiceMock.markRead.mockResolvedValue(expected);

    const req = {} as any;
    const result = await controller.markRead('9', req);

    expect(result).toBe(expected);
    expect(notificationsServiceMock.markRead).toHaveBeenCalledWith(9, 1);
  });
});
