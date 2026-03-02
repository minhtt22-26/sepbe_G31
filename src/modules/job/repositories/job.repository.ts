import { BadRequestException, Injectable } from '@nestjs/common';
import { JobApplicationStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) { }
  async createJobWithForm(data: any) {
    const occupation = await this.prisma.occupation.findUnique({
      where: { id: data.jobData.occupationId }
    })

    if (!occupation) {
      throw new BadRequestException('Invalid occupationId')
    }
    return this.prisma.job.create({
      data: {
        ...data.jobData,
        applyForms: {
          create: {
            fields: {
              create: data.fields.map((f: any) => ({
                label: f.label,
                fieldType: f.fieldType,
                isRequired: f.isRequired,
                options: f.options,
              }))
            }
          }
        }
      },
      include: {
        applyForms: {
          include: {
            fields: true
          }
        }
      }
    })
  }

  async searchJobs(where: any, orderBy: any, limit: number, offset: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where, orderBy, take: limit, skip: offset,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true
            }
          }
        }
      }),
      this.prisma.job.count({ where })
    ])
    return { items, total }
  }

  async deleteJob(jobId: number) {
    return this.prisma.job.delete({
      where: { id: jobId }
    })
  }
  async updateJobFull(jobId: number, dto: any) {
    return this.prisma.$transaction(async (tx) => {

      const { fields, ...jobData } = dto

      // Update job info trước (luôn cho phép)
      await tx.job.update({
        where: { id: jobId },
        data: jobData
      })

      // Lấy form hiện tại
      const form = await tx.jobApplyForm.findFirst({
        where: { jobId },
        include: { fields: true }
      })

      if (!form) throw new Error('Form not found')

      if (!fields || !Array.isArray(fields)) {
        throw new Error('Fields are required')
      }

      const existingFields = form.fields

      // Kiểm tra có application chưa
      const applicationCount = await tx.jobApplication.count({
        where: { jobId }
      })

      // ===============================
      // CASE 1: ĐÃ CÓ APPLICATION
      // ===============================
      if (applicationCount > 0) {

        for (const field of fields) {

          // Nếu có id => đang cố update field cũ → block
          if (field.id) {
            throw new Error(
              'Cannot modify existing form fields because applications already exist'
            )
          }

          // Không có id => tạo mới
          await tx.jobApplyFormField.create({
            data: {
              formId: form.id,
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              options: field.options
            }
          })
        }

        return { success: true, message: 'Job updated (only new fields added)' }
      }

      // ===============================
      // CASE 2: CHƯA CÓ APPLICATION
      // ===============================

      const existingIds = existingFields.map(f => f.id)
      const dtoIds = fields.filter((f: any) => f.id).map((f: any) => f.id)

      // 🗑 Delete removed fields
      const toDelete = existingIds.filter(id => !dtoIds.includes(id))

      if (toDelete.length > 0) {
        await tx.jobApplyFormField.deleteMany({
          where: { id: { in: toDelete } }
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
              options: field.options
            }
          })
        } else {
          await tx.jobApplyFormField.create({
            data: {
              formId: form.id,
              label: field.label,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              options: field.options
            }
          })
        }
      }
      const updatedJob = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          applyForms: {
            include: { fields: true }
          }
        }
      })

      return { success: true, data: updatedJob }
    })
  }
  async findJobById(jobId: number) {
    return this.prisma.job.findUnique({
      where: { id: jobId }
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
        throw new BadRequestException('You have already applied for this job')
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
}
