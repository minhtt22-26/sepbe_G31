import { BadRequestException, Injectable } from '@nestjs/common'
import { JobApplicationStatus, ReportStatus } from 'src/generated/prisma/enums'
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
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy,
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
        },
      }),
      this.prisma.job.count({ where }),
    ])
    return { items, total }
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
        throw new Error('Fields are required')
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

  async updateApplicationStatus(applicationId: number, status: JobApplicationStatus) {
    return this.prisma.jobApplication.update({
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
  async getAllJobReport(userId: number, status: ReportStatus, page: number, limit: number) {
    const skip = (page - 1) * limit
    return this.prisma.jobReport.findMany({
      where: {
        status: status,
      },
      skip: skip,
      take: limit
    })
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
  async changeJobReportStatus(jobId, status: ReportStatus) {
    return this.prisma.jobReport.update({
      where: { id: jobId },
      data: {
        status: status
      }
    })
  }
}
