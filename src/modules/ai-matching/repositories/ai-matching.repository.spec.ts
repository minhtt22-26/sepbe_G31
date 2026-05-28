import { Test, TestingModule } from '@nestjs/testing'
import { AIMatchingRepository } from './ai-matching.repository'
import { PrismaService } from 'src/prisma.service'
import { MatchingConfigKey } from 'src/generated/prisma/enums'

const mockPrisma = {
  matchingConfig: { findMany: jest.fn(), update: jest.fn() },
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $transaction: jest.fn(),
}

const configs = [
  { key: MatchingConfigKey.SKILL_WEIGHT, value: 0.3 },
  { key: MatchingConfigKey.BENEFIT_WEIGHT, value: 0.1 },
]

describe('AIMatchingRepository', () => {
  let repo: AIMatchingRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrisma.$transaction.mockImplementation((arr: any[]) => Promise.all(arr))

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMatchingRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    repo = module.get<AIMatchingRepository>(AIMatchingRepository)
  })

  // ── getConfigs ────────────────────────────────────────────────────────────

  describe('getConfigs', () => {
    it('returns all matching configs', async () => {
      mockPrisma.matchingConfig.findMany.mockResolvedValue(configs)
      const result = await repo.getConfigs()
      expect(result).toBe(configs)
    })
  })

  // ── updateConfigs ─────────────────────────────────────────────────────────

  describe('updateConfigs', () => {
    it('updates each config and returns updated list', async () => {
      mockPrisma.matchingConfig.update.mockResolvedValue({})
      mockPrisma.matchingConfig.findMany.mockResolvedValue(configs)
      const result = await repo.updateConfigs(configs)
      expect(mockPrisma.matchingConfig.update).toHaveBeenCalledTimes(configs.length)
      expect(result).toBe(configs)
    })
  })

  // ── findMatchedJobs ───────────────────────────────────────────────────────

  describe('findMatchedJobs', () => {
    it('calls $queryRawUnsafe and returns results', async () => {
      const rawJobs = [{ id: 1, skillScore: 0.9, benefitScore: 0.8 }]
      mockPrisma.$queryRawUnsafe.mockResolvedValue(rawJobs)
      const result = await repo.findMatchedJobs([0.1, 0.2], [0.3, 0.4])
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled()
      expect(result).toBe(rawJobs)
    })

    it('handles null cultureEmbedding', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([])
      await repo.findMatchedJobs([0.1, 0.2], null as any)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled()
    })
  })

  // ── findMatchedWorkers ────────────────────────────────────────────────────

  describe('findMatchedWorkers', () => {
    it('calls $queryRawUnsafe with jobId and returns workers', async () => {
      const rawWorkers = [{ userId: 2, skillScore: 0.85, cultureScore: 0.7 }]
      mockPrisma.$queryRawUnsafe.mockResolvedValue(rawWorkers)
      const result = await repo.findMatchedWorkers([0.1, 0.2], [0.3, 0.4], 5)
      expect(result).toBe(rawWorkers)
    })

    it('handles null benefitEmbedding', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([])
      await repo.findMatchedWorkers([0.1, 0.2], null, 5)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled()
    })
  })

  // ── getWorkerEmbeddings ───────────────────────────────────────────────────

  describe('getWorkerEmbeddings', () => {
    it('returns null when no embedding found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ skillEmbedding: null, cultureEmbedding: null }])
      const result = await repo.getWorkerEmbeddings(1)
      expect(result).toBeNull()
    })

    it('returns parsed embeddings when found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{
        skillEmbedding: '[0.1,0.2,0.3]',
        cultureEmbedding: '[0.4,0.5]',
      }])
      const result = await repo.getWorkerEmbeddings(1)
      expect(result?.skillEmbedding).toEqual([0.1, 0.2, 0.3])
      expect(result?.cultureEmbedding).toEqual([0.4, 0.5])
    })

    it('returns null cultureEmbedding when not set', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{
        skillEmbedding: '[0.1,0.2]',
        cultureEmbedding: null,
      }])
      const result = await repo.getWorkerEmbeddings(1)
      expect(result?.cultureEmbedding).toBeNull()
    })
  })

  // ── getJobEmbeddings ──────────────────────────────────────────────────────

  describe('getJobEmbeddings', () => {
    it('returns null when job has no embedding', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ reqEmbedding: null, benefitEmbedding: null }])
      const result = await repo.getJobEmbeddings(1)
      expect(result).toBeNull()
    })

    it('returns parsed embeddings when found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{
        reqEmbedding: '[0.1,0.2]',
        benefitEmbedding: '[0.3,0.4]',
      }])
      const result = await repo.getJobEmbeddings(1)
      expect(result?.reqEmbedding).toEqual([0.1, 0.2])
    })
  })

  // ── updateWorkerEmbeddings ────────────────────────────────────────────────

  describe('updateWorkerEmbeddings', () => {
    it('executes raw update for worker', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1)
      await repo.updateWorkerEmbeddings(1, [0.1, 0.2], [0.3, 0.4])
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled()
    })

    it('handles null cultureEmbedding', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1)
      await repo.updateWorkerEmbeddings(1, [0.1, 0.2], null)
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled()
    })
  })

  // ── updateJobEmbeddings ───────────────────────────────────────────────────

  describe('updateJobEmbeddings', () => {
    it('executes raw update for job', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1)
      await repo.updateJobEmbeddings(5, [0.1, 0.2], [0.3, 0.4])
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled()
    })
  })
})
