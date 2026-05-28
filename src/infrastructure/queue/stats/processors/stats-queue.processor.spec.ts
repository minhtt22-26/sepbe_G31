import { Test, TestingModule } from '@nestjs/testing'
import { StatsQueueProcessor } from './stats-queue.processor'
import { PrismaService } from 'src/prisma.service'

const mockPrisma = {
  user: { count: jest.fn() },
  job: { count: jest.fn() },
  jobApplication: { count: jest.fn() },
  paymentOrder: { aggregate: jest.fn() },
  systemSetting: { upsert: jest.fn(), findUnique: jest.fn() },
}

describe('StatsQueueProcessor', () => {
  let processor: StatsQueueProcessor

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrisma.user.count.mockResolvedValue(100)
    mockPrisma.job.count.mockResolvedValue(50)
    mockPrisma.jobApplication.count.mockResolvedValue(200)
    mockPrisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: 5000000 } })
    mockPrisma.systemSetting.upsert.mockResolvedValue({})

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsQueueProcessor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    processor = module.get<StatsQueueProcessor>(StatsQueueProcessor)
  })

  // ── handleComputeAdminOverview ────────────────────────────────────────────

  describe('handleComputeAdminOverview', () => {
    it('computes and saves admin stats snapshot', async () => {
      const job: any = { id: 'stats-1' }
      const result = await processor.handleComputeAdminOverview(job)
      expect(result.totalWorkers).toBe(100)
      expect(result.totalRevenue).toBe(5000000)
      expect(result.computedAt).toBeDefined()
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'ADMIN_STATS_SNAPSHOT' } }),
      )
    })

    it('handles zero revenue gracefully', async () => {
      mockPrisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: null } })
      const job: any = { id: 'stats-2' }
      const result = await processor.handleComputeAdminOverview(job)
      expect(result.totalRevenue).toBe(0)
    })
  })

  // ── getCachedSnapshot (static) ────────────────────────────────────────────

  describe('getCachedSnapshot', () => {
    it('returns null when no snapshot saved', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null)
      const result = await StatsQueueProcessor.getCachedSnapshot(mockPrisma as any)
      expect(result).toBeNull()
    })

    it('returns parsed snapshot when found', async () => {
      const snapshot = { totalWorkers: 50, totalRevenue: 100000, computedAt: new Date().toISOString() }
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: JSON.stringify(snapshot) })
      const result = await StatsQueueProcessor.getCachedSnapshot(mockPrisma as any)
      expect(result?.totalWorkers).toBe(50)
    })

    it('returns null when stored value is invalid JSON', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: 'not-json' })
      const result = await StatsQueueProcessor.getCachedSnapshot(mockPrisma as any)
      expect(result).toBeNull()
    })
  })
})
