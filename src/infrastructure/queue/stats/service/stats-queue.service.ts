import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import type { Queue } from 'bull'
import { Cron, CronExpression } from '@nestjs/schedule'

export const QUEUE_STATS = 'stats-queue'

export enum StatsJobName {
  COMPUTE_ADMIN_OVERVIEW = 'COMPUTE_ADMIN_OVERVIEW',
}

@Injectable()
export class StatsQueueService {
  private readonly logger = new Logger(StatsQueueService.name)

  constructor(
    @InjectQueue(QUEUE_STATS)
    private readonly statsQueue: Queue,
  ) {}

  async scheduleAdminOverviewCompute() {
    const job = await this.statsQueue.add(
      StatsJobName.COMPUTE_ADMIN_OVERVIEW,
      {},
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    )
    this.logger.log(`[STATS-QUEUE] Scheduled admin overview compute job #${job.id}`)
    return job
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleDailyStatsCompute() {
    this.logger.log('[STATS-QUEUE] Triggering nightly admin stats pre-compute')
    await this.scheduleAdminOverviewCompute()
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.statsQueue.getWaitingCount(),
      this.statsQueue.getActiveCount(),
      this.statsQueue.getCompletedCount(),
      this.statsQueue.getFailedCount(),
    ])
    return { waiting, active, completed, failed }
  }
}
