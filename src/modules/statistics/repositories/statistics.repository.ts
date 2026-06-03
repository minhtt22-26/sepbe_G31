import { Injectable } from '@nestjs/common'
import {
  JobApplicationStatus,
  JobStatus,
  CampaignStatus,
} from 'src/generated/prisma/enums'
import { Prisma } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma.service'
import { OverviewResponseDto } from '../dtos/response/overview.response.dto'
import { JobStatusResponseDto } from '../dtos/response/job-status.response.dto'
import { DashboardStatsRequestDto } from '../dtos/request/dashboard-stats.request.dto'
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

    const jobsWithSuitable = await this.prisma.jobApplication.findMany({
      where: {
        job: { 
          companyId,
          status: { not: JobStatus.DELETED }
        },
        status: JobApplicationStatus.SUITABLE,
      },
      select: { jobId: true },
      distinct: ['jobId'],
    })

    const suitableJobIds = jobsWithSuitable.map(j => j.jobId)

    let hasInterviewWarning = false;
    if (suitableJobIds.length > 0) {
      const scheduledCampaigns = await this.prisma.interviewInvitationCampaign.findMany({
        where: {
          jobId: { in: suitableJobIds },
          status: { not: CampaignStatus.CANCELLED },
          slots: { some: {} }
        },
        select: { jobId: true },
      })
      const scheduledJobIds = new Set(scheduledCampaigns.map(c => c.jobId))
      hasInterviewWarning = suitableJobIds.some(id => !scheduledJobIds.has(id))
    }

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
      hasInterviewWarning,
    }
  }

  async getJobEngagementStatistic(
    companyId: number,
    query: DashboardStatsRequestDto,
  ): Promise<{ timeline: { period: string; views: number; applications: number }[] }> {
    const { from, to } = query

    if (!from || !to) {
      return { timeline: [] }
    }

    const startDate = new Date(from)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(to)
    endDate.setHours(23, 59, 59, 999)

    const [viewsRaw, appsRaw] = await Promise.all([
      this.prisma.$queryRaw<{ period: string; count: number }[]>`
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as period, COUNT(id)::int as count
        FROM "JobView"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          AND "jobId" IN (SELECT id FROM "Job" WHERE "companyId" = ${companyId})
        GROUP BY period
      `,
      this.prisma.$queryRaw<{ period: string; count: number }[]>`
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as period, COUNT(id)::int as count
        FROM "JobApplication"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          AND "jobId" IN (SELECT id FROM "Job" WHERE "companyId" = ${companyId})
        GROUP BY period
      `,
    ])

    const timelineMap = new Map<string, { period: string; views: number; applications: number }>()

    const currDate = new Date(startDate)
    while (currDate <= endDate) {
      const year = currDate.getFullYear()
      const month = String(currDate.getMonth() + 1).padStart(2, '0')
      const day = String(currDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      timelineMap.set(dateStr, { period: dateStr, views: 0, applications: 0 })
      currDate.setDate(currDate.getDate() + 1)
    }

    viewsRaw.forEach((v) => {
      const entry = timelineMap.get(v.period)
      if (entry) entry.views = v.count || 0
    })

    appsRaw.forEach((a) => {
      const entry = timelineMap.get(a.period)
      if (entry) entry.applications = a.count || 0
    })

    return { timeline: Array.from(timelineMap.values()) }
  }

  async getJobStatistic(companyId: number, jobId: number): Promise<any> {
    const result = await this.prisma.jobApplication.groupBy({
      by: ['status'],
      where: {
        job: { id: jobId, companyId },
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

  async getJobStatus(companyId: number): Promise<JobStatusResponseDto> {
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
