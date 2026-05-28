import { Test, TestingModule } from '@nestjs/testing'
import { PaymentQueueProcessor } from './payment-queue.processor'
import { WalletService } from 'src/modules/wallet/wallet.service'
import { EmailQueueService } from 'src/infrastructure/queue/email/service/email-queue.service'
import { PaymentJobName } from '../service/payment-queue.service'

const mockWalletService = {
  processTopupWebhookPayload: jest.fn(),
}

const mockEmailQueueService = {
  addSendEmailJob: jest.fn(),
}

function makeJob(overrides: any = {}): any {
  return {
    id: 'job-1',
    name: PaymentJobName.PROCESS_TOPUP_WEBHOOK,
    attemptsMade: 0,
    opts: { attempts: 5 },
    data: {
      gateway: 'SEPAY',
      payload: { content: 'TOPUP42', transferAmount: 50000 },
      receivedAt: new Date().toISOString(),
    },
    ...overrides,
  }
}

describe('PaymentQueueProcessor', () => {
  let processor: PaymentQueueProcessor

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentQueueProcessor,
        { provide: WalletService, useValue: mockWalletService },
        { provide: EmailQueueService, useValue: mockEmailQueueService },
      ],
    }).compile()

    processor = module.get<PaymentQueueProcessor>(PaymentQueueProcessor)
  })

  // ── handleTopupWebhook ────────────────────────────────────────────────────

  describe('handleTopupWebhook', () => {
    it('calls walletService.processTopupWebhookPayload with job payload', async () => {
      mockWalletService.processTopupWebhookPayload.mockResolvedValue({ success: true })
      await processor.handleTopupWebhook(makeJob())
      expect(mockWalletService.processTopupWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'TOPUP42' }),
      )
    })

    it('propagates error from wallet service', async () => {
      mockWalletService.processTopupWebhookPayload.mockRejectedValue(new Error('DB error'))
      await expect(processor.handleTopupWebhook(makeJob())).rejects.toThrow('DB error')
    })
  })

  // ── handleJobFailed ───────────────────────────────────────────────────────

  describe('handleJobFailed', () => {
    it('does not send email for non-permanent failure', async () => {
      const job = makeJob({ attemptsMade: 2, opts: { attempts: 5 } })
      await processor.handleJobFailed(job, new Error('transient'))
      expect(mockEmailQueueService.addSendEmailJob).not.toHaveBeenCalled()
    })

    it('sends DLQ alert email on permanent failure', async () => {
      mockEmailQueueService.addSendEmailJob.mockResolvedValue(undefined)
      const job = makeJob({ attemptsMade: 5, opts: { attempts: 5 } })
      await processor.handleJobFailed(job, new Error('permanent failure'))
      expect(mockEmailQueueService.addSendEmailJob).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Job'),
          html: expect.stringContaining('permanent failure'),
        }),
      )
    })

    it('swallows email send error silently', async () => {
      mockEmailQueueService.addSendEmailJob.mockRejectedValue(new Error('email failed'))
      const job = makeJob({ attemptsMade: 5, opts: { attempts: 5 } })
      await expect(processor.handleJobFailed(job, new Error('fail'))).resolves.not.toThrow()
    })

    it('uses opts.attempts=1 when opts.attempts is undefined', async () => {
      mockEmailQueueService.addSendEmailJob.mockResolvedValue(undefined)
      const job = makeJob({ attemptsMade: 1, opts: {} })
      await processor.handleJobFailed(job, new Error('fail'))
      expect(mockEmailQueueService.addSendEmailJob).toHaveBeenCalled()
    })
  })
})
