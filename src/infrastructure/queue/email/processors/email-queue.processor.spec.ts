import { Test, TestingModule } from '@nestjs/testing'
import { EmailQueueProcessor } from './email-queue.processor'
import { EmailService } from 'src/infrastructure/email/service/email.service'

const mockEmailService = {
  sendMail: jest.fn(),
}

function makeJob(overrides: any = {}): any {
  return {
    id: 'email-1',
    attemptsMade: 0,
    opts: { attempts: 3 },
    data: {
      to: 'user@test.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
      from: undefined,
    },
    ...overrides,
  }
}

describe('EmailQueueProcessor', () => {
  let processor: EmailQueueProcessor

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueProcessor,
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile()

    processor = module.get<EmailQueueProcessor>(EmailQueueProcessor)
  })

  // ── handleEmailJob ────────────────────────────────────────────────────────

  describe('handleEmailJob', () => {
    it('sends email via emailService and returns success', async () => {
      mockEmailService.sendMail.mockResolvedValue(undefined)
      const result = await processor.handleEmailJob(makeJob())
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        'user@test.com', 'Test Subject', '<p>Hello</p>', undefined,
      )
      expect(result).toEqual({ success: true, to: 'user@test.com', jobId: 'email-1' })
    })

    it('rethrows error when email service fails', async () => {
      mockEmailService.sendMail.mockRejectedValue(new Error('SMTP error'))
      await expect(processor.handleEmailJob(makeJob())).rejects.toThrow('SMTP error')
    })
  })

  // ── handleJobFailed ───────────────────────────────────────────────────────

  describe('handleJobFailed', () => {
    it('logs permanently failed job without throwing', async () => {
      const job = makeJob({ attemptsMade: 3, opts: { attempts: 3 } })
      await expect(processor.handleJobFailed(job, new Error('perm fail'))).resolves.not.toThrow()
    })

    it('returns early for non-permanent failure', async () => {
      const job = makeJob({ attemptsMade: 1, opts: { attempts: 3 } })
      const spy = jest.spyOn(processor['logger'], 'error')
      await processor.handleJobFailed(job, new Error('transient'))
      // Should not log permanent failure message
      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('PERMANENTLY'))
    })
  })
})
