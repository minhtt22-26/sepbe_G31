import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyStatus } from 'src/generated/prisma/enums';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const companyServiceMock: any = {
  create: jest.fn(),
  findAll: jest.fn(),
  findAllByStatus: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  review: jest.fn(),
  // extended
  findByOwnerId: jest.fn(),
  searchCompanies: jest.fn(),
  findPendingUpdates: jest.fn(),
  findPendingUpdateRequest: jest.fn(),
  createReview: jest.fn(),
  getReviewsByCompanyId: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
  reportReview: jest.fn(),
  getReviewReports: jest.fn(),
  updateReviewReportStatus: jest.fn(),
  hideReviewByManager: jest.fn(),
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

  it('updateStatus() should call service.review', async () => {
    const body = { status: CompanyStatus.APPROVED } as any;
    companyServiceMock.review.mockResolvedValue({ id: 3 });
    const result = await controller.updateStatus('3', body, { userId: 1 } as any);
    expect(result).toEqual({ id: 3 });
    expect(companyServiceMock.review).toHaveBeenCalledWith(3, body, 1);
  });

  it('findOne() throws BadRequestException for non-numeric id', () => {
    expect(() => controller.findOne('abc')).toThrow('Invalid company id');
  });

  it('findByOwner delegates to service with ownerId', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue({ id: 1 });
    await controller.findByOwner({ userId: 5 });
    expect(companyServiceMock.findByOwnerId).toHaveBeenCalledWith(5);
  });

  it('search delegates to service', async () => {
    companyServiceMock.searchCompanies.mockResolvedValue({ items: [] });
    await controller.search({} as any);
    expect(companyServiceMock.searchCompanies).toHaveBeenCalled();
  });

  it('findPendingUpdates delegates to service', async () => {
    companyServiceMock.findPendingUpdates.mockResolvedValue([]);
    await controller.findPendingUpdates();
    expect(companyServiceMock.findPendingUpdates).toHaveBeenCalled();
  });

  it('findPendingUpdateRequest passes numeric id', async () => {
    companyServiceMock.findPendingUpdateRequest.mockResolvedValue({});
    await controller.findPendingUpdateRequest('7');
    expect(companyServiceMock.findPendingUpdateRequest).toHaveBeenCalledWith(7);
  });

  it('reviewAlias delegates to service', async () => {
    companyServiceMock.review.mockResolvedValue({});
    await controller.reviewAlias('1', {} as any, { userId: 1 } as any);
    expect(companyServiceMock.review).toHaveBeenCalledWith(1, expect.anything(), 1);
  });

  it('createReview delegates to service', async () => {
    companyServiceMock.createReview.mockResolvedValue({ id: 5 });
    await controller.createReview(1, 2, { rating: 5 });
    expect(companyServiceMock.createReview).toHaveBeenCalledWith(1, 2, { rating: 5 });
  });

  it('getReviews delegates to service', async () => {
    companyServiceMock.getReviewsByCompanyId.mockResolvedValue([]);
    await controller.getReviews(1);
    expect(companyServiceMock.getReviewsByCompanyId).toHaveBeenCalledWith(1);
  });

  it('deleteReview delegates to service', async () => {
    companyServiceMock.deleteReview.mockResolvedValue({});
    await controller.deleteReview(5, 2);
    expect(companyServiceMock.deleteReview).toHaveBeenCalledWith(5, 2);
  });

  it('getReviewReports with defaults', async () => {
    companyServiceMock.getReviewReports.mockResolvedValue({ items: [] });
    await controller.getReviewReports();
    expect(companyServiceMock.getReviewReports).toHaveBeenCalledWith(
      undefined,
      1,
      50,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('hideReview delegates to service', async () => {
    companyServiceMock.hideReviewByManager.mockResolvedValue({});
    await controller.hideReview(5);
    expect(companyServiceMock.hideReviewByManager).toHaveBeenCalledWith(5);
  });
});
