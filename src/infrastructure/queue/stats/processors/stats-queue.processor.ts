import { Process, Processor } from '@nestjs/bull'
import type { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { StatsJobName, QUEUE_STATS } from '../service/stats-queue.service'
import { PrismaService } from 'src/prisma.service'
import {
  JobStatus,
  JobApplicationStatus,
  PaymentStatus,
  EnumUserRole,
} from 'src/generated/prisma/enums'

export interface AdminStatsSnapshot {
  totalWorkers: number
  totalEmployers: number
  totalJobs: number
  activeJobs: number
  totalApplications: number
  suitableApplications: number
  totalRevenue: number
  computedAt: string
}

const CACHE_KEY = 'ADMIN_STATS_SNAPSHOT'

@Processor(QUEUE_STATS)
export class StatsQueueProcessor {
  private readonly logger = new Logger(StatsQueueProcessor.name)

  constructor(private readonly prisma: PrismaService) {}

  @Process(StatsJobName.COMPUTE_ADMIN_OVERVIEW)
  async handleComputeAdminOverview(job: Job): Promise<AdminStatsSnapshot> {
    this.logger.log(`[STATS-QUEUE] Computing admin overview snapshot (job #${job.id})`)

    const [
      totalWorkers,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      suitableApplications,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: EnumUserRole.WORKER } }),
      this.prisma.user.count({ where: { role: EnumUserRole.EMPLOYER } }),
      this.prisma.job.count({ where: { status: { not: JobStatus.DELETED } } }),
      this.prisma.job.count({ where: { status: JobStatus.PUBLISHED } }),
      this.prisma.jobApplication.count(),
      this.prisma.jobApplication.count({
        where: { status: JobApplicationStatus.SUITABLE },
      }),
      this.prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ])

    const snapshot: AdminStatsSnapshot = {
      totalWorkers,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      suitableApplications,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      computedAt: new Date().toISOString(),
    }

    await this.prisma.systemSetting.upsert({
      where: { key: CACHE_KEY },
      update: { value: JSON.stringify(snapshot) },
      create: { key: CACHE_KEY, value: JSON.stringify(snapshot) },
    })

    this.logger.log(
      `[STATS-QUEUE] ✓ Admin overview snapshot saved (jobs=${totalJobs}, workers=${totalWorkers}, revenue=${snapshot.totalRevenue})`,
    )

    return snapshot
  }

  static async getCachedSnapshot(
    prisma: PrismaService,
  ): Promise<AdminStatsSnapshot | null> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: CACHE_KEY },
    })
    if (!setting?.value) return null
    try {
      return JSON.parse(setting.value) as AdminStatsSnapshot
    } catch {
      return null
    }
  }
}
