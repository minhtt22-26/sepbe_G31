import { Test, TestingModule } from '@nestjs/testing'
import { QueueTestController } from './queue-test.controller'
import { EmailQueueService } from 'src/infrastructure/queue/email/service/email-queue.service'

const mockEmailQueueService = {
  addSendEmailJob: jest.fn(),
  getQueueStats: jest.fn(),
}

describe('QueueTestController', () => {
  let controller: QueueTestController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueTestController],
      providers: [{ provide: EmailQueueService, useValue: mockEmailQueueService }],
    }).compile()
    controller = module.get<QueueTestController>(QueueTestController)
  })

  describe('testForgotPasswordEmail', () => {
    it('adds email job to queue and returns success', async () => {
      mockEmailQueueService.addSendEmailJob.mockResolvedValue({ id: 'job-1' })
      const result = await controller.testForgotPasswordEmail({ email: 'test@test.com' })
      expect(result.success).toBe(true)
      expect(result.jobId).toBe('job-1')
      expect(result.to).toBe('test@test.com')
    })

    it('returns error message when queue fails', async () => {
      mockEmailQueueService.addSendEmailJob.mockRejectedValue(new Error('Queue down'))
      const result = await controller.testForgotPasswordEmail({ email: 'test@test.com' })
      expect(result.success).toBe(false)
      expect(result.message).toBe('Queue down')
    })
  })

  describe('testSendEmail', () => {
    it('queues test email and returns success', async () => {
      mockEmailQueueService.addSendEmailJob.mockResolvedValue({ id: 'job-2' })
      const result = await controller.testSendEmail()
      expect(result.success).toBe(true)
      expect(result.jobId).toBe('job-2')
    })

    it('returns error when fails', async () => {
      mockEmailQueueService.addSendEmailJob.mockRejectedValue(new Error('Redis offline'))
      const result = await controller.testSendEmail()
      expect(result.success).toBe(false)
    })
  })

  describe('getQueueStats', () => {
    it('returns queue statistics', async () => {
      mockEmailQueueService.getQueueStats.mockResolvedValue({ waiting: 0, active: 1 })
      const result = await controller.getQueueStats()
      expect(result.success).toBe(true)
      expect(result.stats.active).toBe(1)
    })

    it('returns error when stats unavailable', async () => {
      mockEmailQueueService.getQueueStats.mockRejectedValue(new Error('Queue error'))
      const result = await controller.getQueueStats()
      expect(result.success).toBe(false)
    })
  })
})
