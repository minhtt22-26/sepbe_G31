import { BadRequestException, Injectable } from '@nestjs/common'
import {
  JobApplicationStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ReportStatus,
} from 'src/generated/prisma/enums'
import { JobStatus } from 'src/generated/prisma/browser'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) { }
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

    if (data.fields && data.fields.length > 0) {
      jobDataCreate.applyForms = {
        create: [
          {
            fields: {
              create: data.fields.map((f: any) => ({
                label: f.label,
                fieldType: f.fieldType,
                isRequired: f.isRequired,
                options: f.options,
              })),
            },
          },
        ],
      }
    }

    return this.prisma.job.create({
      data: jobDataCreate,
      include: {
        applyForms: {
          include: {
            fields: true,
          },
        },
      },
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
          OR: [{ boostExpiredAt: null }, { boostExpiredAt: { gt: now } }],
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
          OR: [{ boostExpiredAt: null }, { boostExpiredAt: { gt: now } }],
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

  async createBoostPaymentOrder(params: {
    userId: number
    jobId: number
    amount: number
    paymentMethod: PaymentMethod
  }) {
    return this.prisma.paymentOrder.create({
      data: {
        userId: params.userId,
        orderType: OrderType.BOOST_JOB,
        targetId: params.jobId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        status: PaymentStatus.PENDING,
      },
    })
  }

  async findPaymentOrderById(orderId: number) {
    return this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    })
  }

  async activateBoostAfterPayment(params: {
    orderId: number
    jobId: number
    durationDays: number
    transactionCode?: string
  }) {
    const now = new Date()

    return this.prisma.$transaction(async (tx) => {
      const existingJob = await tx.job.findUnique({
        where: { id: params.jobId },
        select: { boostExpiredAt: true },
      })

      const baseDate =
        existingJob?.boostExpiredAt && existingJob.boostExpiredAt > now
          ? existingJob.boostExpiredAt
          : now

      const boostExpiredAt = new Date(baseDate)
      boostExpiredAt.setDate(boostExpiredAt.getDate() + params.durationDays)

      const order = await tx.paymentOrder.update({
        where: { id: params.orderId },
        data: {
          status: PaymentStatus.COMPLETED,
          transactionCode: params.transactionCode,
        },
      })

      const job = await tx.job.update({
        where: { id: params.jobId },
        data: {
          isBoosted: true,
          boostExpiredAt,
        },
      })

      return { order, job }
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
      const { fields, ...jobData } = dto

      // Update job info trước (luôn cho phép)
      await tx.job.update({
        where: { id: jobId },
        data: jobData,
      })

      // Lấy form hiện tại
      let form = await tx.jobApplyForm.findFirst({
        where: { jobId },
        include: { fields: true },
      })

      if (!form) {
        // Tạo biến form mới nếu chưa có
        form = await tx.jobApplyForm.create({
          data: { jobId },
          include: { fields: true },
        })
      }

      if (!fields || !Array.isArray(fields)) {
        const updatedJob = await tx.job.findUnique({
          where: { id: jobId },
          include: {
            applyForms: {
              include: { fields: true },
            },
          },
        })
        return { success: true, data: updatedJob }
      }

      const existingFields = form.fields

      // Kiểm tra có application chưa
      const applicationCount = await tx.jobApplication.count({
        where: { jobId },
      })

      // ===============================
      // CASE 1: ĐÃ CÓ APPLICATION
      // ===============================
      if (applicationCount > 0) {
        for (const field of fields) {
          // Nếu có id => đang cố update field cũ → block
          if (field.id) {
            throw new Error(
              'Cannot modify existing form fields because applications already exist',
            )
          }

          // Không có id => tạo mới
          await tx.jobApplyFormField.create({
            data: {
              formId: form.id,
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              options: field.options,
            },
          })
        }

        return { success: true, message: 'Job updated (only new fields added)' }
      }

      // ===============================
      // CASE 2: CHƯA CÓ APPLICATION
      // ===============================

      const existingIds = existingFields.map((f) => f.id)
      const dtoIds = fields.filter((f: any) => f.id).map((f: any) => f.id)

      // 🗑 Delete removed fields
      const toDelete = existingIds.filter((id) => !dtoIds.includes(id))

      if (toDelete.length > 0) {
        await tx.jobApplyFormField.deleteMany({
          where: { id: { in: toDelete } },
        })
      }

      // Update or Create
      for (const field of fields) {
        if (field.id) {
          await tx.jobApplyFormField.update({
            where: { id: field.id },
            data: {
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              options: field.options,
            },
          })
        } else {
          await tx.jobApplyFormField.create({
            data: {
              formId: form.id,
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              options: field.options,
            },
          })
        }
      }
      const updatedJob = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          applyForms: {
            include: { fields: true },
          },
        },
      })

      return { success: true, data: updatedJob }
    })
  }
  async findJobById(jobId: number) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applyForms: {
          include: {
            fields: true,
          },
        },
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

  async findJobWithApplyForm(jobId: number) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        applyForms: {
          orderBy: { id: 'asc' },
          take: 1,
          select: {
            id: true,
            fields: {
              orderBy: { id: 'asc' },
              select: {
                id: true,
                label: true,
                fieldType: true,
                isRequired: true,
                options: true,
              },
            },
          },
        },
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

  async applyJob(data: {
    jobId: number
    userId: number
    answers: { fieldId: number; value: string }[]
  }) {
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

        await tx.jobApplicationAnswer.deleteMany({
          where: {
            jobApplicationId: existing.id,
          },
        })
      }

      await tx.jobApplicationAnswer.createMany({
        data: data.answers.map((answer) => ({
          jobApplicationId: applicationId!,
          fieldId: answer.fieldId,
          value: answer.value,
        })),
      })

      return tx.jobApplication.findUnique({
        where: {
          id: applicationId,
        },
        include: {
          answers: true,
        },
      })
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
        answers: {
          select: {
            fieldId: true,
            value: true,
            field: {
              select: {
                id: true,
                label: true,
                fieldType: true,
                isRequired: true,
                options: true,
              },
            },
          },
        },
      },
    })
  }

  async findApplicationsForCompany(companyId: number, jobId?: number) {
    return this.prisma.jobApplication.findMany({
      where: {
        job: {
          companyId,
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
        answers: {
          select: {
            fieldId: true,
            value: true,
            field: {
              select: {
                id: true,
                label: true,
                fieldType: true,
              },
            },
          },
        },
      },
    })
  }

  async updateApplicationStatus(
    applicationId: number,
    status: JobApplicationStatus,
  ) {
    const app = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        job: {
          select: {
            title: true,
            companyId: true,
          },
        },
      },
    })

    let title = '';
    let message = '';

    switch (status as any) {
      case 'VIEWED':
        title = 'Hồ sơ đã được xem';
        message = `Nhà tuyển dụng đã xem hồ sơ của bạn cho vị trí "${app.job.title}".`;
        break;
      case 'SUITABLE':
        title = 'Hồ sơ phù hợp';
        message = `Hồ sơ của bạn cho vị trí "${app.job.title}" được đánh giá là phù hợp!`;
        break;
      case 'UNSUITABLE':
        title = 'Hồ sơ chưa phù hợp';
        message = `Rất tiếc, hồ sơ của bạn cho vị trí "${app.job.title}" chưa phù hợp ở thời điểm hiện tại.`;
        break;
    }

    if (title && app.userId) {
      await this.prisma.notification.create({
        data: {
          userId: app.userId,
          title,
          message,
          link: `/job/${app.jobId}`,
        },
      });
    }

    return app;
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
    status: ReportStatus,
    page: number,
    limit: number,
  ) {
    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10
    const skip = (pageNum - 1) * limitNum
    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobReport.findMany({
        where: { status: status },
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
      this.prisma.jobReport.count({ where: { status: status } }),
    ])
    return { data, total, page, limit }
  }

  async createJobReport(userId: number, dto: any) {
    return this.prisma.jobReport.create({
      data: {
        jobId: dto.jobId,
        reporterId: userId,
        reason: dto.reason,
        description: dto.description,
        status: 'PENDING',
      },
    })
  }
  async changeJobReportStatus(reportId: number, status: ReportStatus) {
    const report = await this.prisma.jobReport.update({
      where: { id: reportId },
      data: { status: status },
      include: {
        job: true,
      },
    })

    let title = '';
    let message = '';
    if (status === ReportStatus.RESOLVED) {
      title = 'Báo cáo đã được giải quyết';
      message = `Báo cáo của bạn về công việc "${report.job.title}" đã được giải quyết. Cảm ơn bạn đã đóng góp.`;
    } else if (status === ReportStatus.REJECTED) {
      title = 'Báo cáo không được chấp nhận';
      message = `Báo cáo của bạn về công việc "${report.job.title}" không được chấp nhận do không phát hiện vi phạm.`;
    }

    if (title) {
      await this.prisma.notification.create({
        data: {
          userId: report.reporterId,
          title,
          message,
          link: `/job/${report.jobId}`,
        },
      });
    }

    return report;
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

    let title = '';
    let message = '';

    if (status === JobStatus.PUBLISHED) {
      title = 'Tin tuyển dụng đã được duyệt';
      message = `Tin tuyển dụng "${job.title}" của bạn đã được quản trị viên phê duyệt.`;
    } else if (status === JobStatus.DELETED || status as any === 'REJECTED') {
      title = 'Tin tuyển dụng bị từ chối/gỡ bỏ';
      message = `Tin tuyển dụng "${job.title}" của bạn đã bị từ chối hoặc gỡ bỏ do vi phạm quy định.`;
    } else if (status === JobStatus.WARNING) {
      title = 'Tin tuyển dụng bị tạm ngưng';
      message = `Tin tuyển dụng "${job.title}" đang chờ kiểm duyệt thủ công do có dấu hiệu nghi ngờ.`;
    }

    if (title && job.company) {
      await this.prisma.notification.create({
        data: {
          userId: job.company.ownerId,
          title,
          message,
          link: `/employer`,
        },
      });
    }

    return job;
  }
}
