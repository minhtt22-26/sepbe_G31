import { Process, Processor } from '@nestjs/bull'
import type { Job } from 'bull'
import { QUEUE_EMAIL } from '../services/email-queue.service'
import type { SendEmailJobData } from '../services/email-queue.service'

@Processor(QUEUE_EMAIL)
export class EmailQueueProcessor {
  @Process('send-email')
  async handleEmailJob(job: Job<SendEmailJobData>) {
    console.log(`[QUEUE] Processing email job #${job.id} to ${job.data.to}`)

    try {
      // TODO: Implement actual email sending logic
      // In a real scenario, inject EmailService via constructor
      // For now, just log the processing
      
      console.log(`[QUEUE] ✓ Email job processed for ${job.data.to}`)
      return { success: true, to: job.data.to, jobId: job.id }
    } catch (error) {
      console.error(`[QUEUE] ✗ Email job #${job.id} failed:`, error?.message)
      throw error
    }
  }
}
