import { Test, TestingModule } from '@nestjs/testing'
import { StatsQueueService, QUEUE_STATS } from './stats-queue.service'
import { getQueueToken } from '@nestjs/bull'

const mockQueue = {
  add: jest.fn(),
  getWaitingCount: jest.fn(),
  getActiveCount: jest.fn(),
  getCompletedCount: jest.fn(),
  getFailedCount: jest.fn(),
}

describe('StatsQueueService', () => {
  let service: StatsQueueService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsQueueService,
        { provide: getQueueToken(QUEUE_STATS), useValue: mockQueue },
      ],
    }).compile()
    service = module.get<StatsQueueService>(StatsQueueService)
  })

  describe('scheduleAdminOverviewCompute', () => {
    it('adds job to stats queue', async () => {
      mockQueue.add.mockResolvedValue({ id: 'stats-job-1' })
      const result = await service.scheduleAdminOverviewCompute()
      expect(mockQueue.add).toHaveBeenCalledWith(
        'COMPUTE_ADMIN_OVERVIEW',
        {},
        expect.objectContaining({ attempts: 3 }),
      )
      expect(result).toEqual({ id: 'stats-job-1' })
    })
  })

  describe('scheduleDailyStatsCompute', () => {
    it('triggers admin overview compute', async () => {
      mockQueue.add.mockResolvedValue({ id: 'nightly' })
      await service.scheduleDailyStatsCompute()
      expect(mockQueue.add).toHaveBeenCalled()
    })
  })

  describe('getQueueStats', () => {
    it('returns all queue counts', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(2)
      mockQueue.getActiveCount.mockResolvedValue(0)
      mockQueue.getCompletedCount.mockResolvedValue(100)
      mockQueue.getFailedCount.mockResolvedValue(1)
      const result = await service.getQueueStats()
      expect(result).toEqual({ waiting: 2, active: 0, completed: 100, failed: 1 })
    })
  })
})
