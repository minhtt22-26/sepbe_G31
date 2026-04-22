import { Injectable } from '@nestjs/common'
import {
  JobApplicationStatus,
  JobStatus,
  PaymentStatus,
} from 'src/generated/prisma/enums'
import { Prisma } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma.service'
import { OverviewResponseDto } from '../dtos/response/overview.response.dto'
import { ApplicationFunnelResponseDto } from '../dtos/response/application-funnel.response.dto'
import { PaymentStatsResponseDto } from '../dtos/response/payment-stats.response.dto'
import { PaymentStatsRequestDto } from '../dtos/request/payment-stats.request.dto'
import { JobStatusResponseDto } from '../dtos/response/job-status.response.dto'

@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính % thay đổi.
   * Nếu trước đó = 0 và hiện tại > 0 → 100%
   * Nếu cả hai = 0 → 0%
   */
  private calcChangePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 1000) / 10
  }

  async getOverview(companyId: number): Promise<OverviewResponseDto> {
    const now = new Date()

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    )

    const startOfCurrentWeek = new Date(now)
    const dayOfWeek = startOfCurrentWeek.getDay() || 7
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - dayOfWeek + 1)
    startOfCurrentWeek.setHours(0, 0, 0, 0)

    const [viewsCurrent, viewsPreviousMonth] = await Promise.all([
      this.prisma.job.aggregate({
        where: { companyId, status: { not: JobStatus.DELETED } },
        _sum: { viewCount: true },
      }),
      this.prisma.job.aggregate({
        where: {
          companyId,
          status: { not: JobStatus.DELETED },
          createdAt: { lt: startOfCurrentMonth },
        },
        _sum: { viewCount: true },
      }),
    ])

    const totalViewsCurrent = viewsCurrent._sum.viewCount ?? 0
    const totalViewsPrevious = viewsPreviousMonth._sum.viewCount ?? 0

    const [appsCurrentMonth, appsPreviousMonth] = await Promise.all([
      this.prisma.jobApplication.count({
        where: {
          job: { companyId },
          updatedAt: { gte: startOfCurrentMonth },
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          job: { companyId },
          updatedAt: {
            gte: startOfPreviousMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
    ])

    const [suitableCurrentMonth, suitablePreviousMonth] = await Promise.all([
      this.prisma.jobApplication.count({
        where: {
          job: { companyId },
          status: JobApplicationStatus.SUITABLE,
          updatedAt: { gte: startOfCurrentMonth },
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          job: { companyId },
          status: JobApplicationStatus.SUITABLE,
          updatedAt: {
            gte: startOfPreviousMonth,
            lt: startOfCurrentMonth,
          },
        },
      }),
    ])

    const conversionCurrent =
      appsCurrentMonth > 0
        ? Math.round((suitableCurrentMonth / appsCurrentMonth) * 1000) / 10
        : 0
    const conversionPrevious =
      appsPreviousMonth > 0
        ? Math.round((suitablePreviousMonth / appsPreviousMonth) * 1000) / 10
        : 0

    const [activeJobsCurrent, activeJobsAtStartOfMonth, newJobsThisWeek] =
      await Promise.all([
        this.prisma.job.count({
          where: { companyId, status: JobStatus.PUBLISHED },
        }),
        this.prisma.job.count({
          where: {
            companyId,
            status: JobStatus.PUBLISHED,
            createdAt: { lt: startOfCurrentMonth },
          },
        }),
        this.prisma.job.count({
          where: {
            companyId,
            status: { not: JobStatus.DELETED },
            createdAt: { gte: startOfCurrentWeek },
          },
        }),
      ])

    return {
      totalViews: {
        value: totalViewsCurrent,
        changePercent: this.calcChangePercent(
          totalViewsCurrent,
          totalViewsPrevious,
        ),
      },
      totalApplications: {
        value: appsCurrentMonth,
        changePercent: this.calcChangePercent(
          appsCurrentMonth,
          appsPreviousMonth,
        ),
      },
      conversionRate: {
        value: conversionCurrent,
        changePercent: this.calcChangePercent(
          conversionCurrent,
          conversionPrevious,
        ),
      },
      activeJobs: {
        value: activeJobsCurrent,
        changePercent: this.calcChangePercent(
          activeJobsCurrent,
          activeJobsAtStartOfMonth,
        ),
      },
      newJobsThisWeek,
    }
  }

  async getApplication(
    companyId: number,
    jobId?: number,
  ): Promise<ApplicationFunnelResponseDto> {
    const result = await this.prisma.jobApplication.groupBy({
      by: ['status'],
      where: {
        job: {
          companyId,
          ...(jobId ? { id: jobId } : {}),
        },
      },
      _count: { id: true },
    })

    const funnel: any = {
      applied: 0,
      viewed: 0,
      suitable: 0,
      unsuitable: 0,
      cancelled: 0,
      total: 0,
      timeline: [] as { period: string; views: number; applications: number }[],
    }

    if (jobId) {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId, companyId },
        include: { occupation: true, _count: { select: { applications: true } } },
      })
      if (job) {
        const applicationsCount = job._count.applications
        const conversionRate = job.viewCount > 0 ? (applicationsCount / job.viewCount) * 100 : 0
        funnel.jobInfo = {
          title: job.title,
          occupationName: job.occupation?.name || 'N/A',
          status: job.status,
          viewCount: job.viewCount,
          applicationsCount,
          conversionRate: Number(conversionRate.toFixed(2)),
        }
      }
    }

    for (const item of result) {
      funnel.total += item._count.id
      if (item.status === JobApplicationStatus.APPLIED)
        funnel.applied = item._count.id
      else if (item.status === JobApplicationStatus.VIEWED)
        funnel.viewed = item._count.id
      else if (item.status === JobApplicationStatus.SUITABLE)
        funnel.suitable = item._count.id
      else if (item.status === JobApplicationStatus.UNSUITABLE)
        funnel.unsuitable = item._count.id
      else if (item.status === JobApplicationStatus.CANCELLED)
        funnel.cancelled = item._count.id
    }

    // Lấy thống kê theo thời gian (14 ngày gần nhất)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 13)
    startDate.setHours(0, 0, 0, 0)

    const viewsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as period, COUNT(id)::int as count
      FROM "JobView"
      WHERE "createdAt" >= ${startDate}
      ${
        jobId
          ? Prisma.sql`AND "jobId" = ${jobId}`
          : Prisma.sql`AND "jobId" IN (SELECT id FROM "Job" WHERE "companyId" = ${companyId})`
      }
      GROUP BY period
    `

    const appsRaw = await this.prisma.$queryRaw<any[]>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as period, COUNT(id)::int as count
      FROM "JobApplication"
      WHERE "createdAt" >= ${startDate}
      ${
        jobId
          ? Prisma.sql`AND "jobId" = ${jobId}`
          : Prisma.sql`AND "jobId" IN (SELECT id FROM "Job" WHERE "companyId" = ${companyId})`
      }
      GROUP BY period
    `

    const timelineMap = new Map<
      string,
      { period: string; views: number; applications: number }
    >()

    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      timelineMap.set(dateStr, { period: dateStr, views: 0, applications: 0 })
    }

    viewsRaw.forEach((v) => {
      if (timelineMap.has(v.period)) {
        timelineMap.get(v.period)!.views = v.count || 0
      }
    })

    appsRaw.forEach((a) => {
      if (timelineMap.has(a.period)) {
        timelineMap.get(a.period)!.applications = a.count || 0
      }
    })

    funnel.timeline = Array.from(timelineMap.values())

    return funnel
  }


  async getPaymentStats(
    ownerId: number,
    query: PaymentStatsRequestDto,
  ): Promise<PaymentStatsResponseDto> {
    const { from, to, groupBy } = query
    const page = query.page && query.page > 0 ? query.page : 1
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10
    const skip = (page - 1) * limit
    const groupByRaw = Prisma.sql([groupBy])

    const totalSpent = await this.prisma.paymentOrder.aggregate({
      where: {
        userId: ownerId,
        status: PaymentStatus.COMPLETED,
      },
      _sum: { amount: true },
    })

    const trends = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC(${groupByRaw}, "createdAt") AS period,
        SUM(amount)::int AS amount
      FROM "PaymentOrder"
      WHERE "userId" = ${ownerId}
        AND "status" = 'COMPLETED'
        AND "createdAt" >= ${new Date(from)}
        AND "createdAt" <= ${new Date(to)}
      GROUP BY period
      ORDER BY period ASC
    `

    const where = {
      userId: ownerId,
      status: PaymentStatus.COMPLETED,
      createdAt: {
        gte: new Date(from),
        lte: new Date(to),
      },
    }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.paymentOrder.findMany({
        where,
        include: {
          paymentPackage: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentOrder.count({ where }),
    ])

    return {
      totalSpent: totalSpent._sum.amount || 0,
      trends: trends.map((item) => ({
        period: item.period.toISOString(),
        amount: item.amount || 0,
      })),
      transactions: transactions.map((item) => ({
        id: item.id,
        orderType: item.orderType,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        paymentMethod: item.paymentMethod,
        packageDays: item.packageDays,
        packageName:
          item.paymentPackage?.name ||
          (item.packageDays ? `${item.packageDays} ngày` : 'Chưa xác định'),
        transactionCode: item.transactionCode || `DH-${item.id}`,
        createdAt: item.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPage: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getJobStatus(
    companyId: number,
  ): Promise<JobStatusResponseDto> {
    const result = await this.prisma.job.groupBy({
      by: ['status'],
      where: {
        companyId,
        status: { not: JobStatus.DELETED },
      },
      _count: { id: true },
    })

    const stats: JobStatusResponseDto = {
      published: 0,
      expired: 0,
      warning: 0,
      total: 0,
    }

    for (const item of result) {
      stats.total += item._count.id
      if (item.status === JobStatus.PUBLISHED) stats.published = item._count.id
      else if (item.status === JobStatus.EXPIRED) stats.expired = item._count.id
      else if (item.status === JobStatus.WARNING) stats.warning = item._count.id
    }

    return stats
  }
}
