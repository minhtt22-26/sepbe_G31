import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';
import { PrismaService } from 'src/prisma.service';
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service';
import { CompanyStatus } from 'src/generated/prisma/enums';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const prismaMock = {
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
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

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CloudinaryService, useValue: cloudinaryMock },
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
      where: { status: CompanyStatus.APPROVED },
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
  });

  it('review should throw on invalid status', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.review(1, { status: CompanyStatus.PENDING } as any, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('review should throw on reject without reason', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.review(1, { status: CompanyStatus.REJECTED } as any, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('review should update status to approved', async () => {
    const expected = { id: 1, status: CompanyStatus.APPROVED };
    prismaMock.company.findUnique.mockResolvedValue({ id: 1, ownerId: 10 });
    prismaMock.company.update.mockResolvedValue(expected);
    prismaMock.notification.create.mockResolvedValue({ id: 1 });

    const result = await service.review(
      1,
      { status: CompanyStatus.APPROVED } as any,
      1,
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
      { name: 'Updated' } as any,
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
});
