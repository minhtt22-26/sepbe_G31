import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import type { Queue } from 'bull'

export const QUEUE_EMAIL = 'email-queue'

export interface SendEmailJobData {
  to: string
  subject: string
  html: string
  from?: string
}

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(QUEUE_EMAIL) private emailQueue: Queue<SendEmailJobData>) {}

  async addSendEmailJob(data: SendEmailJobData) {
    console.log('[QUEUE] Adding email job to queue:', data.to)
    return this.emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    })
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ])

    return { waiting, active, completed, failed }
  }
}
