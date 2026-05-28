import { Test, TestingModule } from '@nestjs/testing'
import { PaymentQueueService, QUEUE_PAYMENT } from './payment-queue.service'
import { getQueueToken } from '@nestjs/bull'

const mockQueue = {
  add: jest.fn(),
  getWaitingCount: jest.fn(),
  getActiveCount: jest.fn(),
  getCompletedCount: jest.fn(),
  getFailedCount: jest.fn(),
  getFailed: jest.fn(),
  getJob: jest.fn(),
}

describe('PaymentQueueService', () => {
  let service: PaymentQueueService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentQueueService,
        { provide: getQueueToken(QUEUE_PAYMENT), useValue: mockQueue },
      ],
    }).compile()
    service = module.get<PaymentQueueService>(PaymentQueueService)
  })

  describe('queueTopupWebhook', () => {
    it('adds job to queue with correct options', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' })
      const result = await service.queueTopupWebhook({
        gateway: 'SEPAY',
        payload: { content: 'TOPUP42' },
      })
      expect(mockQueue.add).toHaveBeenCalledWith(
        'PROCESS_TOPUP_WEBHOOK',
        expect.objectContaining({ gateway: 'SEPAY', payload: { content: 'TOPUP42' } }),
        expect.objectContaining({ attempts: 5 }),
      )
      expect(result).toEqual({ id: 'job-1' })
    })
  })

  describe('getQueueStats', () => {
    it('returns all queue counts', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(3)
      mockQueue.getActiveCount.mockResolvedValue(1)
      mockQueue.getCompletedCount.mockResolvedValue(50)
      mockQueue.getFailedCount.mockResolvedValue(2)
      const stats = await service.getQueueStats()
      expect(stats).toEqual({ waiting: 3, active: 1, completed: 50, failed: 2 })
    })
  })

  describe('getFailedJobs', () => {
    it('fetches failed jobs with default limit', async () => {
      mockQueue.getFailed.mockResolvedValue([{ id: 'fail-1' }])
      const result = await service.getFailedJobs()
      expect(mockQueue.getFailed).toHaveBeenCalledWith(0, 19)
      expect(result).toHaveLength(1)
    })

    it('fetches failed jobs with custom limit', async () => {
      mockQueue.getFailed.mockResolvedValue([])
      await service.getFailedJobs(5)
      expect(mockQueue.getFailed).toHaveBeenCalledWith(0, 4)
    })
  })

  describe('retryFailedJob', () => {
    it('retries job and returns success', async () => {
      const mockJob = { retry: jest.fn().mockResolvedValue(undefined) }
      mockQueue.getJob.mockResolvedValue(mockJob)
      const result = await service.retryFailedJob('job-1')
      expect(mockJob.retry).toHaveBeenCalled()
      expect(result).toEqual({ jobId: 'job-1', retried: true })
    })

    it('returns null when job not found', async () => {
      mockQueue.getJob.mockResolvedValue(null)
      const result = await service.retryFailedJob('nonexistent')
      expect(result).toBeNull()
    })
  })
})
