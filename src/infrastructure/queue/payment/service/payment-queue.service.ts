import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import type { Queue } from 'bull'

export const QUEUE_PAYMENT = 'payment-queue'

export enum PaymentJobName {
  PROCESS_TOPUP_WEBHOOK = 'PROCESS_TOPUP_WEBHOOK',
}

export type PaymentGateway = 'SEPAY'

export interface ProcessTopupWebhookJobData {
  gateway: PaymentGateway
  payload: Record<string, unknown>
  receivedAt: string
}

@Injectable()
export class PaymentQueueService {
  private readonly logger = new Logger(PaymentQueueService.name)

  constructor(
    @InjectQueue(QUEUE_PAYMENT)
    private readonly paymentQueue: Queue<ProcessTopupWebhookJobData>,
  ) {}

  async queueTopupWebhook(data: Omit<ProcessTopupWebhookJobData, 'receivedAt'>) {
    const job = await this.paymentQueue.add(
      PaymentJobName.PROCESS_TOPUP_WEBHOOK,
      { ...data, receivedAt: new Date().toISOString() },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    )
    this.logger.log(`[PAYMENT-QUEUE] Queued ${data.gateway} webhook job #${job.id}`)
    return job
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.paymentQueue.getWaitingCount(),
      this.paymentQueue.getActiveCount(),
      this.paymentQueue.getCompletedCount(),
      this.paymentQueue.getFailedCount(),
    ])
    return { waiting, active, completed, failed }
  }

  async getFailedJobs(limit = 20) {
    return this.paymentQueue.getFailed(0, limit - 1)
  }

  async retryFailedJob(jobId: string) {
    const job = await this.paymentQueue.getJob(jobId)
    if (!job) return null
    await job.retry()
    return { jobId, retried: true }
  }
}
