import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma.service';
import { CompanyRegisterDto } from './dtos/request/company.register';
import { CompanyStatus, EnumUserRole } from 'src/generated/prisma/enums';
import { UpdateCompanyDto } from './dtos/request/company.update';
import { CompanyReviewDto } from './dtos/request/company.review';
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'
import type { RedisClientType } from 'redis'

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    @Inject(REDIS_CLIENT) private redis: RedisClientType,
  ) { }

  async findAll() {
    const cacheKey = 'companies:approved'

    // Try to get from Redis
    try {
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        console.log('From Redis')
        return JSON.parse(cached)
      }
    } catch (err) {
      console.error('[CACHE] Get from Redis failed:', err?.message)
    }

    console.log('From Database')

    const companies = await this.prisma.company.findMany({
      where: {
        status: CompanyStatus.APPROVED,
      },
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
    })

    // Set directly to Redis
    try {
      await this.redis.setEx(cacheKey, 600, JSON.stringify(companies))
      console.log('[CACHE] Set key success:', cacheKey)
    } catch (err) {
      console.error('[CACHE] Set key failed:', err?.message)
    }

    return companies
  }

  async findAllByStatus(status: CompanyStatus) {
    return this.prisma.company.findMany({
      where: {
        status,
      },
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
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
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

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async findByOwnerId(ownerId: number) {
    const cachedKey = `company:owner:${ownerId}`;

    // Try to get from Redis
    try {
      const cached = await this.redis.get(cachedKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    catch (err) {
      console.error('[CACHE] Get from Redis failed:', err?.message);
    }
    const company = await this.prisma.company.findFirst({
      where: { ownerId: ownerId },
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

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.ownerId !== ownerId) {
      throw new ForbiddenException('You are not the owner of this company');
    }
    try {
      await this.redis.setEx(cachedKey, 600, JSON.stringify(company));
    } catch (err) {
      console.error('[CACHE] Set key failed:', err?.message);
    }
    return company;
  }
  async review(id: number, body: CompanyReviewDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (
      body.status !== CompanyStatus.APPROVED &&
      body.status !== CompanyStatus.REJECTED
    ) {
      throw new BadRequestException('Invalid status');
    }

    if (body.status === CompanyStatus.REJECTED && !body.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: {
        status: body.status,
        rejectionReason:
          body.status === CompanyStatus.REJECTED
            ? body.rejectionReason
            : null,
      },
    });

    const title =
      body.status === CompanyStatus.APPROVED
        ? 'Công ty đã được duyệt'
        : 'Công ty bị từ chối';
    const message =
      body.status === CompanyStatus.REJECTED
        ? body.rejectionReason || 'Công ty đã bị từ chối'
        : 'Công ty của bạn đã được duyệt';

    await this.prisma.notification.create({
      data: {
        userId: company.ownerId,
        title,
        message,
        link: `/company/${company.id}`,
      },
    });

    return updatedCompany;
  }

  async create(
    data: CompanyRegisterDto,
    files: {
      logo?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
    ownerId: number,
  ) {
    try {
      let logoUrl: string | undefined;
      let businessLicenseUrl: string | undefined;

      // Upload song song nếu có file
      const uploadTasks: Promise<any>[] = [];

      if (files?.logo?.[0]) {
        uploadTasks.push(
          this.cloudinary.uploadFile(files.logo[0], 'company/logo'),
        );
      } else {
        uploadTasks.push(Promise.resolve(null));
      }

      if (files?.businessLicense?.[0]) {
        uploadTasks.push(
          this.cloudinary.uploadFile(
            files.businessLicense[0],
            'company/license',
          ),
        );
      } else {
        uploadTasks.push(Promise.resolve(null));
      }

      const [logoUpload, licenseUpload]: any = await Promise.all(uploadTasks);

      if (logoUpload) {
        logoUrl = logoUpload.secure_url;
      }

      if (licenseUpload) {
        businessLicenseUrl = licenseUpload.secure_url;
      }

      // Lưu DB
      const createdCompany = await this.prisma.company.create({
        data: {
          ownerId,
          name: data.name,
          taxCode: data.taxCode,
          status: CompanyStatus.PENDING,
          address: data.address,
          description: data.description,
          website: data.website,
          logoUrl,
          businessLicenseUrl,
        },
      });
      const manager = await this.prisma.user.findFirst({
        where: { role: EnumUserRole.MANAGER },
        select: { id: true },
      });

      if (manager) {
        await this.prisma.notification.create({
          data: {
            userId: manager.id,
            title: 'Công ty mới chờ duyệt',
            message: `Công ty "${data.name}" vừa đăng ký và đang chờ duyệt.`,
            link: `/admin/companies/${createdCompany.id}`,
          },
        });
      }

      return createdCompany;


    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to create company',
      );
    }
  }
  async update(
    id: number,
    body: UpdateCompanyDto,
    files: any,
    ownerId: number,
  ) {

    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.ownerId !== ownerId) {
      throw new ForbiddenException('You are not allowed');
    }

    let logoUrl = company.logoUrl;
    let businessLicenseUrl = company.businessLicenseUrl;

    // nếu có upload file mới
    if (files?.logo?.length) {
      const uploadLogo = await this.cloudinary.uploadFile(files.logo[0], 'company/logo') as { secure_url: string };
      logoUrl = uploadLogo.secure_url;
    }

    if (files?.businessLicense?.length) {
      const uploadLicense = await this.cloudinary.uploadFile(
        files.businessLicense[0],
        'company/license',
      ) as { secure_url: string };
      businessLicenseUrl = uploadLicense.secure_url;
    }

    const { ...updateData } = body as any;

    return this.prisma.company.update({
      where: { id },
      data: {
        ...updateData,
        logoUrl: logoUrl,
        businessLicenseUrl: businessLicenseUrl,
      },
    });
  }

}
