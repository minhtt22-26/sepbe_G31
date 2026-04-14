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

@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(companyId: number): Promise<OverviewResponseDto> {
    const [publishedCount, expiredCount, totalJobs] = await Promise.all([
      this.prisma.job.count({
        where: { companyId, status: JobStatus.PUBLISHED },
      }),

      this.prisma.job.count({
        where: { companyId, status: JobStatus.EXPIRED },
      }),

      this.prisma.job.count({
        where: { companyId, status: { not: JobStatus.DELETED } },
      }),
    ])

    const totalApplications = await this.prisma.jobApplication.count({
      where: { job: { companyId } },
    })

    const suitableCount = await this.prisma.jobApplication.count({
      where: { job: { companyId }, status: JobApplicationStatus.SUITABLE },
    })

    const totalQuantity = await this.prisma.job.aggregate({
      where: {
        companyId,
        status: { in: [JobStatus.EXPIRED, JobStatus.PUBLISHED] },
      },
      _sum: {
        quantity: true,
      },
    })

    let filledRate = 0
    if (totalQuantity._sum.quantity && totalQuantity._sum.quantity > 0) {
      filledRate = Math.round(
        (suitableCount / totalQuantity._sum.quantity) * 100,
      )
    }

    return {
      totalJobs,
      publishedJobs: publishedCount,
      expiredJobs: expiredCount,
      totalApplications,
      suitableCount,
      filledRate,
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

    const funnel = {
      applied: 0,
      viewed: 0,
      suitable: 0,
      unsuitable: 0,
      cancelled: 0,
      total: 0,
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

    return funnel
  }

  async getPaymentStats(
    ownerId: number,
    query: PaymentStatsRequestDto,
  ): Promise<PaymentStatsResponseDto> {
    const { from, to, groupBy } = query
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

    return {
      totalSpent: totalSpent._sum.amount || 0,
      trends: trends.map((item) => ({
        period: item.period.toISOString(),
        amount: item.amount || 0,
      })),
    }
  }
}
