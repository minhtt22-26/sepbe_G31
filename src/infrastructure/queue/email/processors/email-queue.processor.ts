import { Process, Processor } from '@nestjs/bull'
import type { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { EmailService } from 'src/infrastructure/email/service/email.service'
import { QUEUE_EMAIL } from '../service/email-queue.service'
import type { SendEmailJobData } from '../service/email-queue.service'

@Processor(QUEUE_EMAIL)
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name)

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleEmailJob(job: Job<SendEmailJobData>) {
    this.logger.log(`[QUEUE] Processing email job #${job.id} → ${job.data.to}`)
    try {
      await this.emailService.sendMail(
        job.data.to,
        job.data.subject,
        job.data.html,
        job.data.from,
      )
      this.logger.log(`[QUEUE] ✓ Email job #${job.id} sent to ${job.data.to}`)
      return { success: true, to: job.data.to, jobId: job.id }
    } catch (error) {
      this.logger.error(`[QUEUE] ✗ Email job #${job.id} failed: ${error?.message}`)
      throw error
    }
  }
}
