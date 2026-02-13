import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyStatus } from 'src/generated/prisma/enums';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const companyServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findAllByStatus: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  review: jest.fn(),
};

describe('CompanyController', () => {
  let controller: CompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: companyServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create() should call service.create', async () => {
    const body = { name: 'Company A' } as any;
    const files = {
      logo: [{ path: 'logo.png' }],
      businessLicense: [{ path: 'license.pdf' }],
    } as any;
    const expected = { id: 1 };

    companyServiceMock.create.mockResolvedValue(expected);

    const user = { userId: 1 };
    const result = await controller.create(body, files, user);

    expect(result).toBe(expected);
    expect(companyServiceMock.create).toHaveBeenCalledWith(body, files, 1);
  });

  it('findAll() should call service.findAll', async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    companyServiceMock.findAll.mockResolvedValue(expected);

    const result = await controller.findAll();

    expect(result).toBe(expected);
    expect(companyServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('findAllByStatus() should call service.findAllByStatus', async () => {
    const expected = [{ id: 3 }];
    companyServiceMock.findAllByStatus.mockResolvedValue(expected);

    const result = await controller.findAllByStatus(CompanyStatus.APPROVED);

    expect(result).toBe(expected);
    expect(companyServiceMock.findAllByStatus).toHaveBeenCalledWith(
      CompanyStatus.APPROVED,
    );
  });

  it('findOne() should call service.findOne with numeric id', async () => {
    const expected = { id: 10 };
    companyServiceMock.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('10');

    expect(result).toBe(expected);
    expect(companyServiceMock.findOne).toHaveBeenCalledWith(10);
  });

  it('update() should call service.update', async () => {
    const body = { name: 'Updated' } as any;
    const files = { logo: [{ path: 'logo.png' }] } as any;
    const expected = { id: 2 };

    companyServiceMock.update.mockResolvedValue(expected);

    const result = await controller.update('2', body, files, { userId: 1 } as any);

    expect(result).toBe(expected);
    expect(companyServiceMock.update).toHaveBeenCalledWith(2, body, files, 1);
  });

  it('review() should call service.review', async () => {
    const body = {
      status: CompanyStatus.APPROVED,
    } as any;
    const expected = { id: 3 };

    companyServiceMock.review.mockResolvedValue(expected);

    const result = await controller.review('3', body);

    expect(result).toBe(expected);
    expect(companyServiceMock.review).toHaveBeenCalledWith(3, body);
  });
});
