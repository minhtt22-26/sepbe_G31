import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';
import { PrismaService } from 'src/prisma.service';
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider';
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service';
import { CompanyStatus } from 'src/generated/prisma/enums';
import { CompanyRepository } from './company.repository';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const prismaMock = {
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
};

const cloudinaryMock = {
  uploadFile: jest.fn(),
};

const redisMock = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
};

const companyRepositoryMock = {
  searchCompaies: jest.fn(),
};
describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CloudinaryService, useValue: cloudinaryMock },
        { provide: CompanyRepository, useValue: companyRepositoryMock },
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll should return companies', async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    prismaMock.company.findMany.mockResolvedValue(expected);

    const result = await service.findAll();

    expect(result).toBe(expected);
    expect(prismaMock.company.findMany).toHaveBeenCalledWith({
      include: {
        owner: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('findAllByStatus should return companies by status', async () => {
    const expected = [{ id: 3 }];
    prismaMock.company.findMany.mockResolvedValue(expected);

    const result = await service.findAllByStatus(CompanyStatus.REJECTED);

    expect(result).toBe(expected);
    expect(prismaMock.company.findMany).toHaveBeenCalledWith({
      where: { status: CompanyStatus.REJECTED },
      include: {
        owner: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  });

  it('findOne should throw when not found', async () => {
    prismaMock.company.findUnique.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne should return company', async () => {
    const expected = { id: 1 };
    prismaMock.company.findUnique.mockResolvedValue(expected);

    const result = await service.findOne(1);

    expect(result).toBe(expected);
    expect(prismaMock.company.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        owner: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  });

  it('review should throw on invalid status', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.review(1, { status: CompanyStatus.PENDING } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('review should throw on reject without reason', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.review(1, { status: CompanyStatus.REJECTED } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('review should update status to approved', async () => {
    const expected = { id: 1, status: CompanyStatus.APPROVED };
    prismaMock.company.findUnique.mockResolvedValue({ id: 1, ownerId: 10 });
    prismaMock.company.update.mockResolvedValue(expected);
    prismaMock.notification.create.mockResolvedValue({ id: 1 });

    const result = await service.review(
      1,
      { status: CompanyStatus.APPROVED },
    );

    expect(result).toBe(expected);
    expect(prismaMock.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: CompanyStatus.APPROVED,
        rejectionReason: null,
      },
    });
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 10,
        title: 'Công ty đã được duyệt',
        message: 'Công ty của bạn đã được duyệt',
        link: '/company/1',
      },
    });
  });

  it('create should upload files and create company', async () => {
    const data = { name: 'Company A', taxCode: 'TAX' } as any;
    const files = {
      logo: [{ path: 'logo.png' }],
      businessLicense: [{ path: 'license.pdf' }],
    } as any;

    cloudinaryMock.uploadFile
      .mockResolvedValueOnce({ secure_url: 'logo-url' })
      .mockResolvedValueOnce({ secure_url: 'license-url' });

    const expected = { id: 1 };
    prismaMock.company.findFirst.mockResolvedValue(null);
    prismaMock.company.create.mockResolvedValue(expected);
    prismaMock.user.findFirst.mockResolvedValue({ id: 2 });
    prismaMock.notification.create.mockResolvedValue({ id: 1 });

    const result = await service.create(data, files, 1);

    expect(result).toBe(expected);
    expect(cloudinaryMock.uploadFile).toHaveBeenCalledTimes(2);
    expect(prismaMock.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: 1,
        name: data.name,
        taxCode: data.taxCode,
        status: CompanyStatus.PENDING,
        logoUrl: 'logo-url',
        businessLicenseUrl: 'license-url',
      }),
    });
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 2,
        title: 'Công ty mới chờ duyệt',
      }),
    });
  });

  it('update should throw if company not found', async () => {
    prismaMock.company.findUnique.mockResolvedValue(null);

    await expect(
      service.update(1, {} as any, {}, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update should throw if not owner', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1, ownerId: 2 });

    await expect(
      service.update(1, {} as any, {}, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update should upload new files and update company', async () => {
    prismaMock.company.findUnique.mockResolvedValue({
      id: 1,
      ownerId: 1,
      logoUrl: 'old-logo',
      businessLicenseUrl: 'old-license',
    });

    cloudinaryMock.uploadFile
      .mockResolvedValueOnce({ secure_url: 'new-logo' })
      .mockResolvedValueOnce({ secure_url: 'new-license' });

    const expected = { id: 1 };
    prismaMock.company.update.mockResolvedValue(expected);

    const result = await service.update(
      1,
      { name: 'Updated' },
      {
        logo: [{ path: 'logo.png' }],
        businessLicense: [{ path: 'license.pdf' }],
      },
      1,
    );

    expect(result).toBe(expected);
    expect(prismaMock.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        name: 'Updated',
        logoUrl: 'new-logo',
        businessLicenseUrl: 'new-license',
      }),
    });
  });

  // ── findByOwnerId ────────────────────────────────────────────────────────

  it('findByOwnerId should return company when found', async () => {
    prismaMock.company.findFirst.mockResolvedValue({ id: 1, ownerId: 5 });
    const result = await service.findByOwnerId(5);
    expect(result).toEqual({ id: 1, ownerId: 5 });
  });

  it('findByOwnerId should throw NotFoundException when not found', async () => {
    prismaMock.company.findFirst.mockResolvedValue(null);
    await expect(service.findByOwnerId(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findByOwnerId should throw ForbiddenException when ownerId mismatch', async () => {
    prismaMock.company.findFirst.mockResolvedValue({ id: 1, ownerId: 99 });
    await expect(service.findByOwnerId(5)).rejects.toBeInstanceOf(ForbiddenException);
  });

  // ── findPendingUpdates ────────────────────────────────────────────────────

  it('findPendingUpdates should return companies in UPDATING status', async () => {
    const expected = [{ id: 1, status: CompanyStatus.UPDATING }];
    prismaMock.company.findMany.mockResolvedValue(expected);
    const result = await service.findPendingUpdates();
    expect(result).toBe(expected);
    expect(prismaMock.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: CompanyStatus.UPDATING } }),
    );
  });

  // ── findPendingUpdateRequest ──────────────────────────────────────────────

  it('findPendingUpdateRequest should return current and proposed data', async () => {
    const company = { id: 1 };
    const updateRequest = { id: 10, payload: { name: 'New Name' } };
    prismaMock.company.findUnique.mockResolvedValue(company);
    (prismaMock as any).companyProfileUpdateRequest = { findFirst: jest.fn().mockResolvedValue(updateRequest) };
    const result = await service.findPendingUpdateRequest(1);
    expect(result.companyId).toBe(1);
    expect(result.current).toBe(company);
    expect(result.request).toBe(updateRequest);
  });

  // ── review with UPDATING status (reviewPendingUpdate) ────────────────────

  it('review should call reviewPendingUpdate when company is in UPDATING status', async () => {
    const company = { id: 1, ownerId: 5, status: CompanyStatus.UPDATING };
    const pendingRequest = { id: 10, payload: { name: 'Updated Co' } };
    prismaMock.company.findUnique.mockResolvedValue(company);
    (prismaMock as any).companyProfileUpdateRequest = {
      findFirst: jest.fn().mockResolvedValue(pendingRequest),
      update: jest.fn(),
    };
    const updatedCompany = { id: 1, ownerId: 5 };
    prismaMock.company.update.mockResolvedValue(updatedCompany);
    prismaMock.notification.create.mockResolvedValue({});
    (prismaMock as any).$transaction = jest.fn().mockResolvedValue([updatedCompany]);
    (prismaMock as any).redisMock = redisMock;

    const result = await service.review(1, { status: CompanyStatus.APPROVED });
    expect(result).toBe(updatedCompany);
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });

  // ── create with duplicate taxCode ─────────────────────────────────────────

  it('create should throw BadRequestException when taxCode already registered', async () => {
    prismaMock.company.findFirst.mockResolvedValue({ id: 99 });
    await expect(
      service.create({ name: 'Co', taxCode: 'DUPLICATE' } as any, {}, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create should succeed without taxCode check when taxCode not provided', async () => {
    prismaMock.company.findFirst.mockResolvedValue(null);
    cloudinaryMock.uploadFile.mockResolvedValue(null);
    prismaMock.company.create.mockResolvedValue({ id: 5 });
    prismaMock.user.findFirst.mockResolvedValue(null); // no manager
    const result = await service.create({ name: 'Co' }, {}, 1);
    expect(result).toEqual({ id: 5 });
  });

  // ── ensureCompanyApprovedForEmployerActions ───────────────────────────────

  it('ensureCompanyApprovedForEmployerActions should return company when approved', async () => {
    prismaMock.company.findFirst.mockResolvedValue({ id: 1, ownerId: 5, status: CompanyStatus.APPROVED });
    const result = await service.ensureCompanyApprovedForEmployerActions(5);
    expect(result).toEqual(expect.objectContaining({ status: CompanyStatus.APPROVED }));
  });

  it('ensureCompanyApprovedForEmployerActions should throw ForbiddenException when not approved', async () => {
    prismaMock.company.findFirst.mockResolvedValue({ id: 1, ownerId: 5, status: CompanyStatus.PENDING });
    await expect(service.ensureCompanyApprovedForEmployerActions(5)).rejects.toBeInstanceOf(ForbiddenException);
  });

  // ── searchCompanies ───────────────────────────────────────────────────────

  it('searchCompanies should return paginated results with review stats', async () => {
    const items = [{ id: 1, name: 'WorkLink' }];
    companyRepositoryMock.searchCompaies.mockResolvedValue({ items, total: 1 });
    (prismaMock as any).companyReview = {
      groupBy: jest.fn().mockResolvedValue([
        { companyId: 1, _avg: { rating: 4.5 }, _count: { _all: 10 } },
      ]),
    };
    const result = await service.searchCompanies({ keyword: 'work', limit: 10, skip: 0, page: 1 });
    expect(result.items[0].reviewAvg).toBe(4.5);
    expect(result.items[0].reviewCount).toBe(10);
  });

  it('searchCompanies should return empty when no items', async () => {
    companyRepositoryMock.searchCompaies.mockResolvedValue({ items: [], total: 0 });
    const result = await service.searchCompanies({ limit: 10, skip: 0, page: 1 });
    expect(result.items).toHaveLength(0);
  });

  // ── createReview ──────────────────────────────────────────────────────────

  it('createReview should throw NotFoundException when company not found', async () => {
    prismaMock.company.findUnique.mockResolvedValue(null);
    await expect(service.createReview(99, 1, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createReview should throw BadRequestException when review already exists', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1 });
    (prismaMock as any).companyReview = {
      findUnique: jest.fn().mockResolvedValue({ id: 5 }),
    };
    await expect(service.createReview(1, 1, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createReview should create review when valid', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1 });
    (prismaMock as any).companyReview = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 10 }),
    };
    const result = await service.createReview(1, 2, { rating: 5 });
    expect(result).toEqual({ id: 10 });
  });

  // ── getReviewsByCompanyId ─────────────────────────────────────────────────

  it('getReviewsByCompanyId should mask anonymous reviews', async () => {
    (prismaMock as any).companyReview = {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, isAnonymous: true, user: { fullName: 'Real Name', avatar: 'url' } },
        { id: 2, isAnonymous: false, user: { fullName: 'Public Name', avatar: null } },
      ]),
    };
    const result = await service.getReviewsByCompanyId(1);
    expect(result[0].user.fullName).toBe('Anonymous');
    expect(result[1].user.fullName).toBe('Public Name');
  });
});
