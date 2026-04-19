import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common'
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service'
import { PrismaService } from 'src/prisma.service'
import { CompanyRegisterDto } from './dtos/request/company.register'
import {
  CompanyStatus,
  EnumUserRole,
  ReportStatus,
  ReviewStatus,
} from 'src/generated/prisma/enums'
import { UpdateCompanyDto } from './dtos/request/company.update'
import { CompanyReviewDto } from './dtos/request/company.review'
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'
import type { RedisClientType } from 'redis'
import {
  CompanySearchDto,
  CompanySortBy,
} from './dtos/request/company.search.request.dto'
import { CompanyRepository } from './company.repository'
import { Prisma } from 'src/generated/prisma/client'
import { createPaginatedResult } from 'src/common/utils/pagination.util'

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly companyRepository: CompanyRepository,
    @Inject(REDIS_CLIENT) private redis: RedisClientType,
  ) {}

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
    })
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
    })

    if (!company) {
      throw new NotFoundException('Company not found')
    }

    return company
  }

  async findByOwnerId(ownerId: number) {
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
    })

    if (!company) {
      throw new NotFoundException('Company not found')
    }

    if (company.ownerId !== ownerId) {
      throw new ForbiddenException('You are not the owner of this company')
    }
    return company
  }
  async review(id: number, body: CompanyReviewDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    })

    if (!company) {
      throw new NotFoundException('Company not found')
    }

    if (
      body.status !== CompanyStatus.APPROVED &&
      body.status !== CompanyStatus.REJECTED
    ) {
      throw new BadRequestException('Invalid status')
    }

    if (body.status === CompanyStatus.REJECTED && !body.rejectionReason) {
      throw new BadRequestException('Rejection reason is required')
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: {
        status: body.status,
        rejectionReason:
          body.status === CompanyStatus.REJECTED ? body.rejectionReason : null,
      },
    })

    const title =
      body.status === CompanyStatus.APPROVED
        ? 'Công ty đã được duyệt'
        : 'Công ty bị từ chối'
    const message =
      body.status === CompanyStatus.REJECTED
        ? body.rejectionReason || 'Công ty đã bị từ chối'
        : 'Công ty của bạn đã được duyệt'

    await this.prisma.notification.create({
      data: {
        userId: company.ownerId,
        title,
        message,
        link: `/company/${company.id}`,
      },
    })

    return updatedCompany
  }

  async create(
    data: CompanyRegisterDto,
    files: {
      logo?: Express.Multer.File[]
      businessLicense?: Express.Multer.File[]
    },
    ownerId: number,
  ) {
    try {
      let logoUrl: string | undefined
      let businessLicenseUrl: string | undefined

      // Upload song song nếu có file
      const uploadTasks: Promise<any>[] = []

      if (files?.logo?.[0]) {
        uploadTasks.push(
          this.cloudinary.uploadFile(files.logo[0], 'company/logo'),
        )
      } else {
        uploadTasks.push(Promise.resolve(null))
      }

      if (files?.businessLicense?.[0]) {
        uploadTasks.push(
          this.cloudinary.uploadFile(
            files.businessLicense[0],
            'company/license',
          ),
        )
      } else {
        uploadTasks.push(Promise.resolve(null))
      }

      const [logoUpload, licenseUpload]: any = await Promise.all(uploadTasks)

      if (logoUpload) {
        logoUrl = logoUpload.secure_url
      }

      if (licenseUpload) {
        businessLicenseUrl = licenseUpload.secure_url
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
      })
      const manager = await this.prisma.user.findFirst({
        where: { role: EnumUserRole.MANAGER },
        select: { id: true },
      })

      if (manager) {
        await this.prisma.notification.create({
          data: {
            userId: manager.id,
            title: 'Công ty mới chờ duyệt',
            message: `Công ty "${data.name}" vừa đăng ký và đang chờ duyệt.`,
            link: `/admin/companies/${createdCompany.id}`,
          },
        })
      }

      return createdCompany
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to create company',
      )
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
    })

    if (!company) {
      throw new NotFoundException('Company not found')
    }

    if (company.ownerId !== ownerId) {
      throw new ForbiddenException('You are not allowed')
    }

    let logoUrl = company.logoUrl
    let businessLicenseUrl = company.businessLicenseUrl

    // nếu có upload file mới
    if (files?.logo?.length) {
      const uploadLogo = (await this.cloudinary.uploadFile(
        files.logo[0],
        'company/logo',
      )) as { secure_url: string }
      logoUrl = uploadLogo.secure_url
    }

    if (files?.businessLicense?.length) {
      const uploadLicense = (await this.cloudinary.uploadFile(
        files.businessLicense[0],
        'company/license',
      )) as { secure_url: string }
      businessLicenseUrl = uploadLicense.secure_url
    }

    const { ...updateData } = body as any

    return this.prisma.company.update({
      where: { id },
      data: {
        ...updateData,
        logoUrl: logoUrl,
        businessLicenseUrl: businessLicenseUrl,
      },
    })
  }

  async searchCompanies(dto: CompanySearchDto) {
    const { keyword, sortBy } = dto
    const skip = dto.skip

    const where: Prisma.CompanyWhereInput = {
      status: CompanyStatus.APPROVED,
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } }, //Ko phan biet hoa thuong
        { description: { contains: keyword, mode: 'insensitive' } },
        { address: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const orderByMap: Record<
      CompanySortBy,
      Prisma.CompanyOrderByWithRelationInput
    > = {
      [CompanySortBy.NEWEST]: { createdAt: 'desc' },
      [CompanySortBy.NAME_ASC]: { name: 'asc' },
      [CompanySortBy.NAME_DESC]: { name: 'desc' },
    }

    const orderBy = orderByMap[sortBy ?? CompanySortBy.NEWEST]

    const { items, total } = await this.companyRepository.searchCompaies(
      where,
      orderBy,
      dto.limit!,
      skip,
    )

    let enrichedItems = items
    if (items.length > 0) {
      const ids = items.map((c) => c.id)
      const stats = await this.prisma.companyReview.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: ids },
          status: ReviewStatus.ACTIVE,
        },
        _avg: { rating: true },
        _count: { _all: true },
      })
      const statMap = new Map(
        stats.map((s) => [
          s.companyId,
          {
            reviewAvg: s._avg.rating,
            reviewCount: s._count._all,
          },
        ]),
      )
      enrichedItems = items.map((c) => {
        const s = statMap.get(c.id)
        const avg = s?.reviewAvg
        return {
          ...c,
          reviewAvg:
            avg != null && !Number.isNaN(Number(avg))
              ? Math.round(Number(avg) * 10) / 10
              : null,
          reviewCount: s?.reviewCount ?? 0,
        }
      })
    }

    return createPaginatedResult(enrichedItems, total, dto.page!, dto.limit!)
  }

  // ================= COMPANY REVIEWS =================

  async createReview(companyId: number, userId: number, dto: any) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    })
    if (!company) throw new NotFoundException('Company not found')

    const existingReview = await this.prisma.companyReview.findUnique({
      where: {
        companyId_userId: { companyId, userId },
      },
    })

    if (existingReview)
      throw new BadRequestException('You have already reviewed this company')

    return this.prisma.companyReview.create({
      data: {
        ...dto,
        companyId,
        userId,
      },
    })
  }

  async getReviewsByCompanyId(companyId: number) {
    const reviews = await this.prisma.companyReview.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return reviews.map((r) => {
      if (r.isAnonymous) {
        return {
          ...r,
          user: { fullName: 'Anonymous', avatar: null },
        }
      }
      return r
    })
  }

  async updateReview(reviewId: number, userId: number, dto: any) {
    const review = await this.prisma.companyReview.findUnique({
      where: { id: reviewId },
    })
    if (!review) throw new NotFoundException('Review not found')

    if (review.userId !== userId)
      throw new ForbiddenException('You can only update your own review')

    const updateData = { ...dto }
    delete updateData.userId
    delete updateData.companyId

    return this.prisma.companyReview.update({
      where: { id: reviewId },
      data: updateData,
    })
  }

  async deleteReview(reviewId: number, userId: number) {
    const review = await this.prisma.companyReview.findUnique({
      where: { id: reviewId },
    })
    if (!review) throw new NotFoundException('Review not found')

    if (review.userId !== userId)
      throw new ForbiddenException('You can only delete your own review')

    return this.prisma.companyReview.delete({ where: { id: reviewId } })
  }

  async reportReview(reviewId: number, userId: number, dto: any) {
    const review = await this.prisma.companyReview.findUnique({
      where: { id: reviewId },
      include: {
        company: { select: { id: true, name: true } },
      },
    })
    if (!review) throw new NotFoundException('Review not found')

    if (review.userId === userId)
      throw new BadRequestException('You cannot report your own review')

    const existingReport = await this.prisma.companyReviewReport.findUnique({
      where: {
        reviewId_reporterId: { reviewId, reporterId: userId },
      },
    })

    if (existingReport)
      throw new BadRequestException('You have already reported this review')

    const created = await this.prisma.companyReviewReport.create({
      data: {
        reviewId,
        reporterId: userId,
        reason: dto.reason,
        description: dto.description,
      },
    })

    const managers = await this.prisma.user.findMany({
      where: { role: EnumUserRole.MANAGER },
      select: { id: true },
    })

    const companyName = review.company?.name || 'Công ty'
    await Promise.all(
      managers.map((m) =>
        this.prisma.notification.create({
          data: {
            userId: m.id,
            title: 'Có báo cáo đánh giá mới',
            message: `(${created.id}) ${companyName}`,
            link: `/manager?tab=review_reports`,
          },
        }),
      ),
    )

    return created
  }

  // ================= MANAGER: REVIEW REPORT MODERATION =================

  /**
   * UC 2.14.6 — List reported reviews for manager (with status filter + pagination).
   */
  async getReviewReports(
    status: 'PENDING' | 'RESOLVED' | 'REJECTED' | undefined,
    page = 1,
    limit = 50,
  ) {
    const where = status ? { status } : {}
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100)

    const [data, total] = await this.prisma.$transaction([
      this.prisma.companyReviewReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          reporter: { select: { id: true, fullName: true, email: true } },
          review: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
              company: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.companyReviewReport.count({ where }),
    ])

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    }
  }

  /**
   * UC 2.14.6 — Approve or reject a review report (manager updates status).
   */
  async updateReviewReportStatus(
    reportId: number,
    status: 'PENDING' | 'RESOLVED' | 'REJECTED',
    managerNote?: string,
  ) {
    const report = await this.prisma.companyReviewReport.findUnique({
      where: { id: reportId },
      include: {
        review: {
          select: {
            id: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!report) throw new NotFoundException('Review report not found')

    const updated = await this.prisma.companyReviewReport.update({
      where: { id: reportId },
      data: {
        status,
        managerNote: managerNote ?? report.managerNote ?? null,
      },
    })

    if (
      status === ReportStatus.RESOLVED ||
      status === ReportStatus.REJECTED
    ) {
      const companyName = report.review?.company?.name ?? 'công ty'
      const companyId = report.review?.company?.id
      const title =
        status === ReportStatus.RESOLVED
          ? 'Báo cáo đánh giá đã được xử lý'
          : 'Báo cáo đánh giá không được chấp nhận'
      const message =
        status === ReportStatus.RESOLVED
          ? `Báo cáo của bạn về đánh giá tại "${companyName}" đã được xử lý. Cảm ơn bạn đã đóng góp.`
          : `Báo cáo của bạn về đánh giá tại "${companyName}" không được chấp nhận do không phát hiện vi phạm.`

      await this.prisma.notification.create({
        data: {
          userId: report.reporterId,
          title,
          message,
          link: companyId != null ? `/company/${companyId}` : '/profile',
        },
      })
    }

    return updated
  }

  /**
   * UC 2.14.7 — Hide an inappropriate review (soft-delete via ReviewStatus.DELETED).
   */
  async hideReviewByManager(reviewId: number) {
    const review = await this.prisma.companyReview.findUnique({
      where: { id: reviewId },
    })
    if (!review) throw new NotFoundException('Review not found')

    return this.prisma.companyReview.update({
      where: { id: reviewId },
      data: { status: 'DELETED' },
    })
  }
}
