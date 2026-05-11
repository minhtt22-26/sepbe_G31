import { Process, Processor } from '@nestjs/bull'
import type { Job } from 'bull'
import { QUEUE_EMAIL } from '../service/email-queue.service'
import type { SendEmailJobData } from '../service/email-queue.service'

@Processor(QUEUE_EMAIL)
export class EmailQueueProcessor {
  @Process('send-email')
  async handleEmailJob(job: Job<SendEmailJobData>) {
    try {
      // TODO: Implement actual email sending logic
      // In a real scenario, inject EmailService via constructor
      // For now, just log the processing
      return { success: true, to: job.data.to, jobId: job.id }
    } catch (error) {
      console.error(`[QUEUE] ✗ Email job #${job.id} failed:`, error?.message)
      throw error
    }
  }
}
