import { OnQueueFailed, Process, Processor } from '@nestjs/bull'
import type { Job } from 'bull'
import { Logger } from '@nestjs/common'
import {
  PaymentJobName,
  QUEUE_PAYMENT,
  type ProcessTopupWebhookJobData,
} from '../service/payment-queue.service'
import { WalletService } from 'src/modules/wallet/wallet.service'
import { EmailQueueService } from 'src/infrastructure/queue/email/service/email-queue.service'

@Processor(QUEUE_PAYMENT)
export class PaymentQueueProcessor {
  private readonly logger = new Logger(PaymentQueueProcessor.name)

  constructor(
    private readonly walletService: WalletService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  @Process(PaymentJobName.PROCESS_TOPUP_WEBHOOK)
  async handleTopupWebhook(job: Job<ProcessTopupWebhookJobData>): Promise<void> {
    this.logger.log(
      `[PAYMENT-QUEUE] Processing job #${job.id} gateway=${job.data.gateway} attempt=${job.attemptsMade + 1}`,
    )
    await this.walletService.processTopupWebhookPayload(job.data.payload)
    this.logger.log(`[PAYMENT-QUEUE] ✓ Job #${job.id} completed`)
  }

  @OnQueueFailed()
  async handleJobFailed(job: Job<ProcessTopupWebhookJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    const isPermanentFailure = job.attemptsMade >= maxAttempts

    this.logger.error(
      `[PAYMENT-QUEUE] Job #${job.id} failed (attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`,
    )

    if (!isPermanentFailure) return

    this.logger.error(
      `[PAYMENT-QUEUE] Job #${job.id} permanently failed — sending DLQ alert`,
    )

    const adminEmail =
      process.env.ADMIN_ALERT_EMAIL ?? process.env.EMAIL_FROM ?? 'admin@sep.vn'

    await this.emailQueueService
      .addSendEmailJob({
        to: adminEmail,
        subject: `[SEP ALERT] Payment Webhook Job #${job.id} thất bại vĩnh viễn`,
        html: `
          <h2 style="color:#c0392b">⚠️ Payment Webhook Job thất bại</h2>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:monospace">
            <tr><td><strong>Job ID</strong></td><td>#${job.id}</td></tr>
            <tr><td><strong>Job Name</strong></td><td>${String(job.name)}</td></tr>
            <tr><td><strong>Gateway</strong></td><td>${job.data.gateway}</td></tr>
            <tr><td><strong>Số lần thử</strong></td><td>${job.attemptsMade}/${maxAttempts}</td></tr>
            <tr><td><strong>Nhận lúc</strong></td><td>${job.data.receivedAt}</td></tr>
            <tr><td><strong>Lỗi</strong></td><td style="color:#c0392b">${error.message}</td></tr>
          </table>
          <h3>Payload</h3>
          <pre style="background:#f4f4f4;padding:12px;border-radius:4px">${JSON.stringify(job.data.payload, null, 2)}</pre>
          <h3>Stack Trace</h3>
          <pre style="background:#fff0f0;padding:12px;border-radius:4px;font-size:12px">${error.stack ?? 'N/A'}</pre>
          <p style="color:#666;font-size:12px">
            Job đang ở trạng thái <strong>failed</strong> trong queue. Vào admin panel để retry thủ công.
          </p>
        `,
      })
      .catch((emailErr: Error) => {
        this.logger.error(
          `[PAYMENT-QUEUE] Failed to send DLQ alert email: ${emailErr?.message}`,
        )
      })
  }
}
