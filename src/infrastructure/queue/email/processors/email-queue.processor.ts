import { OnQueueFailed, Process, Processor } from '@nestjs/bull'
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
    } catch (err) {
      const error = err as Error
      this.logger.error(
        `[QUEUE] ✗ Email job #${job.id} failed (attempt ${job.attemptsMade + 1}): ${error?.message}`,
      )
      throw error
    }
  }

  @OnQueueFailed()
  async handleJobFailed(job: Job<SendEmailJobData>, error: Error) {
    const maxAttempts = job.opts.attempts ?? 1
    const isPermanentFailure = job.attemptsMade >= maxAttempts
    if (!isPermanentFailure) return

    this.logger.error(
      `[EMAIL-QUEUE] ===== JOB #${job.id} FAILED PERMANENTLY =====\n` +
        `  To: ${job.data.to}\n` +
        `  Subject: ${job.data.subject}\n` +
        `  Attempts: ${job.attemptsMade}/${maxAttempts}\n` +
        `  Error: ${error.message}\n` +
        `  Stack: ${error.stack}\n` +
        `  HINT: Kiểm tra EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD trong .env`,
    )
  }
}
