import { BadRequestException, Injectable } from '@nestjs/common'
import {
  EnumUserRole,
  JobApplicationStatus,
  OrderType,
  ReportStatus,
  CampaignStatus,
  InterviewInvitationStatus,
} from 'src/generated/prisma/enums'
import { JobStatus } from 'src/generated/prisma/browser'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}
  async createJobWithForm(data: any) {
    const occupation = await this.prisma.occupation.findUnique({
      where: { id: data.jobData.occupationId },
    })

    if (!occupation) {
      throw new BadRequestException('Invalid occupationId')
    }

    const jobDataCreate: any = {
      ...data.jobData,
    }

    return this.prisma.job.create({
      data: jobDataCreate,
      include: {
        company: {
          select: {
            id: true,
            ownerId: true,
            name: true,
          },
        },
      },
    })
  }

  async isFirstJobPostFree(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { firstJobPostUsedAt: true },
    })
    if (!company) {
      throw new BadRequestException('Company not found')
    }
    return !company.firstJobPostUsedAt
  }

  async publishFirstJobForFree(jobId: number, companyId: number) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date()
      const company = await tx.company.update({
        where: { id: companyId },
        data: {
          firstJobPostUsedAt: now,
        },
        select: {
          ownerId: true,
        },
      })
      const job = await tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PUBLISHED,
        },
      })
      await tx.notification.create({
        data: {
          userId: company.ownerId,
          title: 'Đăng tin miễn phí thành công',
          message: `Tin "${job.title}" đã được xuất bản miễn phí lần đầu.`,
          link: '/employer',
        },
      })
      return job
    })
  }

  async publishJobByPoint(jobId: number) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PUBLISHED,
        },
        include: {
          company: { select: { ownerId: true } },
        },
      })

      if (job.company?.ownerId) {
        await tx.notification.create({
          data: {
            userId: job.company.ownerId,
            title: 'Đăng tin thành công',
            message: `${job.title} (đã trừ point)`,
            link: '/employer',
          },
        })
      }
      return job
    })
  }

  async activateBoostByPoint(params: { jobId: number; durationDays: number }) {
    const now = new Date()
    return this.prisma.$transaction(async (tx) => {
      const existingJob = await tx.job.findUnique({
        where: { id: params.jobId },
        select: {
          boostExpiredAt: true,
          title: true,
          company: { select: { ownerId: true } },
        },
      })
      const baseDate =
        existingJob?.boostExpiredAt && existingJob.boostExpiredAt > now
          ? existingJob.boostExpiredAt
          : now
      const boostExpiredAt = new Date(baseDate)
      boostExpiredAt.setDate(boostExpiredAt.getDate() + params.durationDays)

      const job = await tx.job.update({
        where: { id: params.jobId },
        data: {
          isBoosted: true,
          boostExpiredAt,
        },
      })

      if (existingJob?.company?.ownerId) {
        await tx.notification.create({
          data: {
            userId: existingJob.company.ownerId,
            title: 'Boost job thành công',
            message: `(${params.durationDays} ngày) ${existingJob.title}`,
            link: '/employer',
          },
        })
      }

      return job
    })
  }

  async searchJobs(where: any, orderBy: any, limit: number, offset: number) {
    const resolvedOrderBy = Array.isArray(orderBy)
      ? [{ isBoosted: 'desc' }, ...orderBy]
      : [{ isBoosted: 'desc' }, orderBy]

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy: resolvedOrderBy,
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          occupation: {
            select: {
              id: true,
              name: true,
              sector: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ])
    return { items, total }
  }

  async getNewestJobs(limit: number, offset: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where: { status: JobStatus.PUBLISHED },
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          occupation: {
            select: {
              id: true,
              name: true,
              sector: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.job.count({ where: { status: JobStatus.PUBLISHED } }),
    ])

    return { items, total }
  }

  async deactivateExpiredBoosts() {
    return this.prisma.job.updateMany({
      where: {
        isBoosted: true,
        boostExpiredAt: { lt: new Date() },
      },
      data: {
        isBoosted: false,
        boostExpiredAt: null,
      },
    })
  }

  async getBoostedJobs(limit: number, offset: number) {
    const now = new Date()

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where: {
          status: JobStatus.PUBLISHED,
          isBoosted: true,
          boostExpiredAt: { gt: now },
        },
        orderBy: [{ boostExpiredAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          occupation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.job.count({
        where: {
          status: JobStatus.PUBLISHED,
          isBoosted: true,
          boostExpiredAt: { gt: now },
        },
      }),
    ])

    return { items, total }
  }

  async getJobsByCompanyId(params: {
    companyId: number
    status?: JobStatus
    limit?: number
    skip?: number
  }) {
    const { companyId, status, limit, skip } = params

    const where: any = {
      companyId,
      status: status ? status : { not: JobStatus.DELETED },
    }

    const queryArgs: any = {
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        occupation: {
          select: { id: true, name: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    }

    if (limit !== undefined && skip !== undefined) {
      queryArgs.take = limit
      queryArgs.skip = skip
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany(queryArgs),
      this.prisma.job.count({ where }),
    ])

    return { items, total }
  }

  async getActiveBoostPackages() {
    return this.prisma.paymentPackage.findMany({
      where: {
        orderType: OrderType.BOOST_JOB,
        isActive: true,
      },
      orderBy: [
        { durationDays: 'asc' },
        { price: 'asc' },
        { createdAt: 'asc' },
      ],
    })
  }

  async getBoostPackageByDays(days: number) {
    return this.prisma.paymentPackage.findFirst({
      where: {
        orderType: OrderType.BOOST_JOB,
        durationDays: days,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })
  }

  async getDefaultFeatureListingPackage() {
    const defaultPackage = await this.prisma.paymentPackage.findFirst({
      where: {
        orderType: OrderType.FEATURE_LISTING,
        isActive: true,
        isDefault: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (defaultPackage) {
      return defaultPackage
    }

    return this.prisma.paymentPackage.findFirst({
      where: {
        orderType: OrderType.FEATURE_LISTING,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
  }


  async deleteJob(jobId: number) {
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.DELETED, // Giả sử bạn đã có enum JobStatus
      },
    })
  }
  async updateJobFull(jobId: number, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const jobData = { ...dto }
      delete jobData.fields

      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: jobData,
      })

      return { success: true, data: updatedJob }
    })
  }
  async findJobById(jobId: number) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            logoUrl: true,
            address: true,
            website: true,
          },
        },
        occupation: {
          select: {
            id: true,
            name: true,
            sector: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    })
  }

  async recordView(jobId: number, ipAddress: string): Promise<void> {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const existingView = await this.prisma.jobView.findFirst({
      where: {
        jobId,
        ipAddress,
        createdAt: { gte: yesterday },
      },
    })

    if (!existingView) {
      await this.prisma.$transaction([
        this.prisma.jobView.create({
          data: { jobId, ipAddress },
        }),
        this.prisma.job.update({
          where: { id: jobId },
          data: { viewCount: { increment: 1 } },
        }),
      ])
    }
  }

  async findJobWithApplyForm(jobId: number) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
      },
    })
  }

  async findApplicationByJobAndUser(jobId: number, userId: number) {
    return this.prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    })
  }

  async applyJob(data: { jobId: number; userId: number }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.jobApplication.findUnique({
        where: {
          jobId_userId: {
            jobId: data.jobId,
            userId: data.userId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (existing && existing.status !== JobApplicationStatus.CANCELLED) {
        throw new BadRequestException('Bạn đã ứng tuyển công việc này rồi')
      }

      let applicationId = existing?.id

      if (!existing) {
        const created = await tx.jobApplication.create({
          data: {
            jobId: data.jobId,
            userId: data.userId,
            status: JobApplicationStatus.APPLIED,
          },
          select: {
            id: true,
          },
        })

        applicationId = created.id
      } else {
        await tx.jobApplication.update({
          where: {
            id: existing.id,
          },
          data: {
            status: JobApplicationStatus.APPLIED,
          },
        })
      }

      const application = await tx.jobApplication.findUnique({
        where: {
          id: applicationId,
        },
      })

      const jobRow = await tx.job.findUnique({
        where: { id: data.jobId },
        select: {
          title: true,
          company: { select: { ownerId: true } },
        },
      })

      if (jobRow?.company?.ownerId && jobRow.company.ownerId !== data.userId) {
        const applicantCount = await tx.jobApplication.count({
          where: {
            jobId: data.jobId,
            status: { not: JobApplicationStatus.CANCELLED },
          },
        })
        const employerLink = `/employer?applicantsJobId=${data.jobId}`
        const title = 'Ứng viên mới ứng tuyển'
        const message = `(${applicantCount}) ${jobRow.title}`

        const existing = await tx.notification.findFirst({
          where: {
            userId: jobRow.company.ownerId,
            link: employerLink,
          },
        })

        if (existing) {
          await tx.notification.update({
            where: { id: existing.id },
            data: {
              title,
              message,
              isRead: false,
            },
          })
        } else {
          await tx.notification.create({
            data: {
              userId: jobRow.company.ownerId,
              title,
              message,
              link: employerLink,
            },
          })
        }
      }

      return application
    })
  }

  async cancelApply(jobId: number, userId: number) {
    return this.prisma.jobApplication.update({
      where: {
        jobId_userId: {
          jobId,
          userId,
        },
      },
      data: {
        status: JobApplicationStatus.CANCELLED,
      },
    })
  }

  async findApplicationsByUser(userId: number) {
    return this.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    })
  }

  async findSuitableApplications(
    companyId: number,
    jobId: number,
    page: number,
    limit: number,
    search?: string,
    interviewStatus?: string,
    slotId?: string,
  ) {
    const where: any = {
      status: JobApplicationStatus.SUITABLE,
      jobId: jobId,
      job: {
        companyId: companyId,
        status: { not: JobStatus.DELETED },
      },
    }

    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    if (
      (interviewStatus && interviewStatus !== 'ALL') ||
      (slotId && slotId !== 'ALL')
    ) {
      const allInvitations = await this.prisma.interviewInvitation.findMany({
        where: { campaign: { jobId: jobId } },
        orderBy: { createdAt: 'desc' },
        select: { workerId: true, status: true, selectedSlotId: true },
      })

      const latestInvitationByWorker = new Map()
      for (const inv of allInvitations) {
        if (!latestInvitationByWorker.has(inv.workerId)) {
          latestInvitationByWorker.set(inv.workerId, inv)
        }
      }

      const filteredWorkerIds: number[] = []
      for (const [workerId, inv] of latestInvitationByWorker.entries()) {
        let match = true
        if (interviewStatus && interviewStatus !== 'ALL') {
          match = inv.status === interviewStatus
        }
        if (match && slotId && slotId !== 'ALL') {
          match = inv.selectedSlotId === parseInt(slotId)
        }
        if (match) {
          filteredWorkerIds.push(workerId)
        }
      }

      where.userId = { in: filteredWorkerIds }
    }

    const [applications, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatar: true,
              workerProfile: {
                select: {
                  gender: true,
                  birthYear: true,
                  province: true,
                  experienceYear: true,
                  expectedSalary: true,
                  shift: true,
                  bio: true,
                  occupation: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              interviewInvitations: {
                where: { campaign: { jobId: jobId } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { selectedSlot: true },
              },
            },
          },
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ])

    return { applications, total }
  }

  async findApplicationsForCompany(companyId: number, jobId?: number) {
    return this.prisma.jobApplication.findMany({
      where: {
        job: {
          companyId,
          status: { not: JobStatus.DELETED },
          ...(jobId ? { id: jobId } : {}),
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatar: true,
            workerProfile: {
              select: {
                gender: true,
                birthYear: true,
                province: true,
                experienceYear: true,
                expectedSalary: true,
                shift: true,
                bio: true,
                occupation: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            companyId: true,
          },
        },
      },
    })
  }

  async updateApplicationStatus(
    applicationId: number,
    status: JobApplicationStatus,
  ) {
    if (status === JobApplicationStatus.VIEWED) {
      await this.prisma.$executeRaw`
        UPDATE "JobApplication"
        SET "status" = ${status}, "updatedAt" = "updatedAt"
        WHERE "id" = ${applicationId}
      `
    } else {
      await this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: { status },
      })
    }

    const app = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            title: true,
            companyId: true,
          },
        },
      },
    })

    if (!app) {
      throw new BadRequestException('Application not found')
    }

    let title = ''
    let message = ''

    switch (status as any) {
      case 'VIEWED':
        title = 'Hồ sơ đã được xem'
        message = `Nhà tuyển dụng đã xem hồ sơ của bạn cho vị trí "${app.job.title}".`
        break
      case 'UNSUITABLE':
        title = 'Hồ sơ chưa phù hợp'
        message = `Rất tiếc, hồ sơ của bạn cho vị trí "${app.job.title}" chưa phù hợp ở thời điểm hiện tại.`
        break
      case 'SUITABLE':
        title = 'Hồ sơ phù hợp'
        message = `Chúc mừng! Hồ sơ của bạn cho vị trí "${app.job.title}" đã được đánh giá phù hợp. Nhà tuyển dụng sẽ liên hệ với bạn sớm.`
        break
    }

    if (title && app.userId) {
      await this.prisma.notification.create({
        data: {
          userId: app.userId,
          title,
          message,
          link: `/job/${app.jobId}`,
        },
      })
    }

    return app
  }

  async findApplicationById(applicationId: number) {
    return this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            companyId: true,
          },
        },
      },
    })
  }

  // --- Interview invitation helpers ---
  async getLastInterviewSlotByJob(jobId: number) {
    return this.prisma.interviewInvitationSlot.findFirst({
      where: {
        campaign: { jobId },
      },
      orderBy: { endAt: 'desc' },
      select: { id: true, endAt: true },
    })
  }

  async getLatestActiveCampaignByJob(jobId: number, companyId: number) {
    return this.prisma.interviewInvitationCampaign.findFirst({
      where: {
        jobId,
        companyId,
        status: {
          in: [
            CampaignStatus.IN_PROGRESS,
            CampaignStatus.COMPLETED,
            CampaignStatus.DRAFT,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        slots: { orderBy: { startAt: 'asc' } },
      },
    })
  }

  async checkExistingInvitation(jobId: number, workerId: number) {
    const invitation = await this.prisma.interviewInvitation.findFirst({
      where: {
        workerId,
        campaign: { jobId },
        status: {
          in: [
            InterviewInvitationStatus.PENDING,
            InterviewInvitationStatus.ACCEPTED,
          ],
        },
      },
      select: { id: true },
    })
    return !!invitation
  }

  async addWorkerToCampaign(params: {
    campaignId: number
    workerId: number
    jobTitle: string
    message: string
    slots: {
      startAt: Date
      endAt: Date
      location: string | null
    }[]
  }) {
    const { campaignId, workerId, jobTitle, message: _message, slots } = params

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.interviewInvitation.create({
        data: {
          campaignId,
          workerId,
          status: InterviewInvitationStatus.PENDING,
        },
      })

      await tx.interviewInvitationCampaign.update({
        where: { id: campaignId },
        data: {
          totalCount: { increment: 1 },
          pendingCount: { increment: 1 },
        },
      })

      const _slotSummary = (slots || [])
        .map((slot) => {
          const start = new Date(slot.startAt).toLocaleString('vi-VN')
          const end = new Date(slot.endAt).toLocaleString('vi-VN')
          return `- ${start} - ${end}${slot.location ? ` (${slot.location})` : ''}`
        })
        .join('\n')

      await tx.notification.create({
        data: {
          userId: workerId,
          title: `Bạn có lịch phỏng vấn: ${jobTitle}`,
          message: `Bạn đã nhận được lịch phỏng vấn cho vị trí "${jobTitle}". Vui lòng mở lời mời để chọn ca phù hợp.`,
          link: `/interview-invitations?invitationId=${invitation.id}`,
        },
      })

      return invitation
    })
  }

  async getRelatedJobs(
    jobId: number,
    occupationId: number,
    province: string | null,
    limit: number,
  ) {
    return this.prisma.job.findMany({
      where: {
        id: { not: jobId },
        status: JobStatus.PUBLISHED,
        OR: [{ occupationId }, ...(province ? [{ province }] : [])],
      },
      orderBy: [{ isBoosted: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    })
  }

  async getWishList(where: any, orderBy: any, limit: number, skip: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.savedJob.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        include: {
          job: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.savedJob.count({ where }),
    ])
    return { items, total }
  }

  async findSavedJob(userId: number, jobId: number) {
    return this.prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    })
  }

  async saveJob(userId: number, jobId: number) {
    return this.prisma.savedJob.create({
      data: {
        userId,
        jobId,
      },
    })
  }

  async unSaveJob(userId: number, jobId: number) {
    return this.prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    })
  }

  async findJobReport(userId: number, jobId: number) {
    return this.prisma.jobReport.findUnique({
      where: {
        jobId_reporterId: {
          jobId,
          reporterId: userId,
        },
      },
    })
  }
  async getAllJobReport(
    userId: number,
    status: ReportStatus | 'ALL',
    page: number,
    limit: number,
    companyName?: string,
    reporterName?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }
    if (companyName) {
      where.job = {
        company: { name: { contains: companyName, mode: 'insensitive' } },
      }
    }
    if (reporterName) {
      where.reporter = {
        fullName: { contains: reporterName, mode: 'insensitive' },
      }
    }
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00.000Z`)
        if (!isNaN(from.getTime())) where.createdAt.gte = from
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59.999Z`)
        if (!isNaN(to.getTime())) where.createdAt.lte = to
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobReport.findMany({
        where,
        skip: skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: {
                select: { id: true, name: true, logoUrl: true },
              },
            },
          },
          // include người báo cáo
          reporter: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.jobReport.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async createJobReport(userId: number, dto: any) {
    const report = await this.prisma.jobReport.create({
      data: {
        jobId: dto.jobId,
        reporterId: userId,
        reason: dto.reason,
        description: dto.description,
        status: 'PENDING',
      },
      include: {
        job: { select: { title: true } },
      },
    })

    const managers = await this.prisma.user.findMany({
      where: { role: EnumUserRole.MANAGER },
      select: { id: true },
    })

    await Promise.all(
      managers.map((m) =>
        this.prisma.notification.create({
          data: {
            userId: m.id,
            title: 'Có báo cáo tin tuyển dụng mới',
            message: `(${report.id}) ${report.job.title}`,
            link: `/manager?tab=job_reports`,
          },
        }),
      ),
    )

    return report
  }
  async changeJobReportStatus(reportId: number, status: ReportStatus) {
    const report = await this.prisma.jobReport.update({
      where: { id: reportId },
      data: { status: status },
      include: {
        job: true,
      },
    })

    let title = ''
    let message = ''
    if (status === ReportStatus.RESOLVED) {
      title = 'Báo cáo đã được giải quyết'
      message = `Báo cáo của bạn về công việc "${report.job.title}" đã được giải quyết. Cảm ơn bạn đã đóng góp.`
    } else if (status === ReportStatus.REJECTED) {
      title = 'Báo cáo không được chấp nhận'
      message = `Báo cáo của bạn về công việc "${report.job.title}" không được chấp nhận do không phát hiện vi phạm.`
    }

    if (title) {
      await this.prisma.notification.create({
        data: {
          userId: report.reporterId,
          title,
          message,
          link: `/job/${report.jobId}`,
        },
      })
    }

    return report
  }

  async markExpiredJobs() {
    return this.prisma.job.updateMany({
      where: {
        expiredAt: {
          lt: new Date(),
        },
        status: {
          notIn: [JobStatus.EXPIRED, JobStatus.DELETED],
        },
      },
      data: {
        status: JobStatus.EXPIRED,
      },
    })
  }

  async getWarningJobs(page: number, limit: number) {
    const skip = (page - 1) * limit
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where: { status: JobStatus.WARNING },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          occupation: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.job.count({ where: { status: JobStatus.WARNING } }),
    ])
    return { items, total }
  }

  async updateJobStatus(jobId: number, status: JobStatus) {
    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: { status },
      include: { company: true },
    })

    let title = ''
    let message = ''

    if (status === JobStatus.PUBLISHED) {
      title = 'Tin tuyển dụng đã được duyệt'
      message = `Tin tuyển dụng "${job.title}" của bạn đã được quản trị viên phê duyệt.`
    } else if (status === JobStatus.DELETED || (status as any) === 'REJECTED') {
      title = 'Tin tuyển dụng bị từ chối/gỡ bỏ'
      message = `Tin tuyển dụng "${job.title}" của bạn đã bị từ chối hoặc gỡ bỏ do vi phạm quy định.`
    } else if (status === JobStatus.WARNING) {
      title = 'Tin tuyển dụng chờ thanh toán'
      message = `Tin tuyển dụng "${job.title}" của bạn đã được tạo thành công và đang chờ thanh toán để được hiển thị.`
    }

    if (title && job.company) {
      await this.prisma.notification.create({
        data: {
          userId: job.company.ownerId,
          title,
          message,
          link: `/employer`,
        },
      })
    }

    return job
  }
}
