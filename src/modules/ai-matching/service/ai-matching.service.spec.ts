import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AIMatchingService } from './ai-matching.service'
import { AIMatchingRepository } from '../repositories/ai-matching.repository'
import { ScoringService } from './scoring.service'
import { UserService } from 'src/modules/users/service/user.service'
import { JobService } from 'src/modules/job/service/job.service'
import { EmbeddingService } from 'src/modules/embedding/service/embedding.service'
import { EmbeddingTextBuilder } from 'src/modules/embedding/builder/embedding-text.builder'
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'
import { MatchingConfigKey } from 'src/generated/prisma/enums'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAIMatchingRepo = {
  getWorkerEmbeddings: jest.fn(),
  getJobEmbeddings: jest.fn(),
  findMatchedJobs: jest.fn(),
  findMatchedWorkers: jest.fn(),
  getConfigs: jest.fn(),
  updateConfigs: jest.fn(),
  updateJobEmbeddings: jest.fn(),
  updateWorkerEmbeddings: jest.fn(),
}

const mockScoringService = {
  calculateSalaryScore: jest.fn().mockReturnValue(1.0),
  calculateLocationScore: jest.fn().mockReturnValue(1.0),
  calculateShiftScore: jest.fn().mockReturnValue(1.0),
  calculateGenderScore: jest.fn().mockReturnValue(1.0),
  calculateAgeScore: jest.fn().mockReturnValue(1.0),
  calculateFinalScore: jest.fn().mockReturnValue(0.9),
}

const mockUserService = { getWorkerProfile: jest.fn() }
const mockJobService = { getDetail: jest.fn() }
const mockEmbeddingService = {
  extractJobSections: jest.fn(),
  generateEmbedding: jest.fn(),
}
const mockEmbeddingTextBuilder = {
  buildJobReqText: jest.fn().mockReturnValue('req text'),
  buildJobBenefitText: jest.fn().mockReturnValue('benefit text'),
  buildSkillText: jest.fn().mockReturnValue('skill text'),
  buildCultureText: jest.fn().mockReturnValue('culture text'),
}
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const configs = [
  { key: MatchingConfigKey.SKILL_WEIGHT, value: 0.3 },
  { key: MatchingConfigKey.BENEFIT_WEIGHT, value: 0.1 },
  { key: MatchingConfigKey.SALARY_WEIGHT, value: 0.15 },
  { key: MatchingConfigKey.LOCATION_WEIGHT, value: 0.2 },
  { key: MatchingConfigKey.SHIFT_WEIGHT, value: 0.1 },
  { key: MatchingConfigKey.GENDER_WEIGHT, value: 0.05 },
  { key: MatchingConfigKey.AGE_WEIGHT, value: 0.1 },
  { key: MatchingConfigKey.MIN_SCORE_THRESHOLD, value: 0 },
]

const workerProfile = {
  userId: 1,
  occupationId: 10,
  expectedSalary: 8000000,
  province: 'Hà Nội',
  ward: 'Cầu Giấy',
  shift: 'MORNING',
  gender: 'MALE',
  birthYear: 1995,
  occupation: { id: 10, name: 'Lập trình viên' },
  experienceYear: 3,
  bio: 'Có kinh nghiệm',
  desiredJobText: 'Môi trường tốt',
}

const rawJob = {
  id: 1,
  title: 'Dev',
  description: 'desc',
  quantity: 3,
  province: 'Hà Nội',
  district: 'Cầu Giấy',
  salaryMin: 7000000,
  salaryMax: 12000000,
  workingShift: 'MORNING',
  genderRequirement: null,
  ageMin: null,
  ageMax: null,
  isBoosted: false,
  expiredAt: null,
  occupationId: 10,
  occupationName: 'Lập trình viên',
  companyId: 5,
  companyName: 'WorkLink',
  logoUrl: null,
  skillScore: 0.9,
  benefitScore: 0.8,
}

const rawWorker = {
  userId: 2,
  fullName: 'Nguyen Van A',
  avatar: null,
  phone: '0900000000',
  occupationId: 10,
  occupationName: 'Lập trình viên',
  province: 'Hà Nội',
  ward: 'Cầu Giấy',
  expectedSalary: 8000000,
  shift: 'MORNING',
  gender: 'MALE',
  birthYear: 1995,
  experienceYear: 2,
  bio: 'bio',
  desiredJobText: 'desired',
  skillScore: 0.85,
  cultureScore: 0.7,
}

const job = {
  id: 1,
  title: 'Dev',
  description: 'desc',
  province: 'Hà Nội',
  district: 'Cầu Giấy',
  salaryMin: 7000000,
  salaryMax: 12000000,
  workingShift: 'MORNING',
  genderRequirement: null,
  ageMin: null,
  ageMax: null,
  isBoosted: false,
  occupationId: 10,
  occupation: { id: 10, name: 'Lập trình viên' },
}

const embeddings = { skillEmbedding: [0.1, 0.2], cultureEmbedding: [0.3, 0.4] }
const jobEmbeddings = { reqEmbedding: [0.1, 0.2], benefitEmbedding: [0.3, 0.4] }
const fakeVector = [0.1, 0.2, 0.3]

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AIMatchingService', () => {
  let service: AIMatchingService

  beforeEach(async () => {
    jest.clearAllMocks()

    mockAIMatchingRepo.getConfigs.mockResolvedValue(configs)
    mockAIMatchingRepo.findMatchedJobs.mockResolvedValue([rawJob])
    mockAIMatchingRepo.findMatchedWorkers.mockResolvedValue([rawWorker])
    mockUserService.getWorkerProfile.mockResolvedValue(workerProfile)
    mockAIMatchingRepo.getWorkerEmbeddings.mockResolvedValue(embeddings)
    mockAIMatchingRepo.getJobEmbeddings.mockResolvedValue(jobEmbeddings)
    mockJobService.getDetail.mockResolvedValue(job)
    mockEmbeddingService.extractJobSections.mockResolvedValue({ requirements: 'req', benefits: 'ben' })
    mockEmbeddingService.generateEmbedding.mockResolvedValue(fakeVector)
    mockAIMatchingRepo.updateJobEmbeddings.mockResolvedValue(undefined)
    mockAIMatchingRepo.updateWorkerEmbeddings.mockResolvedValue(undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMatchingService,
        { provide: AIMatchingRepository, useValue: mockAIMatchingRepo },
        { provide: ScoringService, useValue: mockScoringService },
        { provide: UserService, useValue: mockUserService },
        { provide: JobService, useValue: mockJobService },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        { provide: EmbeddingTextBuilder, useValue: mockEmbeddingTextBuilder },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile()

    service = module.get<AIMatchingService>(AIMatchingService)
  })

  // ── getMatchedJobs ────────────────────────────────────────────────────────

  describe('getMatchedJobs', () => {
    it('returns matched jobs sorted by finalScore', async () => {
      const results = await service.getMatchedJobs(1)
      expect(results).toHaveLength(1)
      expect(results[0].job.id).toBe(1)
      expect(results[0].scores).toHaveProperty('finalScore')
    })

    it('throws NotFoundException when worker profile missing', async () => {
      mockUserService.getWorkerProfile.mockResolvedValue(null)
      await expect(service.getMatchedJobs(1)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when no skill embedding', async () => {
      mockAIMatchingRepo.getWorkerEmbeddings.mockResolvedValue({ skillEmbedding: [], cultureEmbedding: null })
      await expect(service.getMatchedJobs(1)).rejects.toThrow(BadRequestException)
    })

    it('adds 0.1 boost bonus for boosted jobs', async () => {
      const boostedJob = { ...rawJob, isBoosted: true }
      mockAIMatchingRepo.findMatchedJobs.mockResolvedValue([boostedJob])
      mockScoringService.calculateFinalScore.mockReturnValue(0.85)
      const results = await service.getMatchedJobs(1)
      expect(results[0].scores.finalScore).toBeCloseTo(0.95)
    })

    it('uses refined skillScore based on same occupation', async () => {
      await service.getMatchedJobs(1)
      // occupationId 10 matches → refinedSkillScore = 0.8 + 0.9 * 0.2 = 0.98
      expect(mockScoringService.calculateFinalScore).toHaveBeenCalledWith(
        expect.objectContaining({ skillScore: expect.closeTo(0.98, 2) }),
        configs,
      )
    })

    it('filters out jobs below min score threshold', async () => {
      const configsWithThreshold = configs.map((c) =>
        c.key === MatchingConfigKey.MIN_SCORE_THRESHOLD ? { ...c, value: 0.95 } : c,
      )
      mockAIMatchingRepo.getConfigs.mockResolvedValue(configsWithThreshold)
      mockScoringService.calculateFinalScore.mockReturnValue(0.5) // below threshold
      const results = await service.getMatchedJobs(1)
      expect(results).toHaveLength(0)
    })
  })

  // ── getSuggestedWorkers ───────────────────────────────────────────────────

  describe('getSuggestedWorkers', () => {
    it('returns matched workers sorted by finalScore', async () => {
      const results = await service.getSuggestedWorkers(1)
      expect(results).toHaveLength(1)
      expect(results[0].worker.userId).toBe(2)
    })

    it('throws NotFoundException when job not found', async () => {
      mockJobService.getDetail.mockResolvedValue(null)
      await expect(service.getSuggestedWorkers(99)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when job has no embedding', async () => {
      mockAIMatchingRepo.getJobEmbeddings.mockResolvedValue({ reqEmbedding: [], benefitEmbedding: null })
      await expect(service.getSuggestedWorkers(1)).rejects.toThrow(BadRequestException)
    })

    it('filters out workers below min score threshold', async () => {
      const configsWithThreshold = configs.map((c) =>
        c.key === MatchingConfigKey.MIN_SCORE_THRESHOLD ? { ...c, value: 0.99 } : c,
      )
      mockAIMatchingRepo.getConfigs.mockResolvedValue(configsWithThreshold)
      mockScoringService.calculateFinalScore.mockReturnValue(0.1)
      const results = await service.getSuggestedWorkers(1)
      expect(results).toHaveLength(0)
    })
  })

  // ── buildJobEmbedding ─────────────────────────────────────────────────────

  describe('buildJobEmbedding', () => {
    it('builds and stores job embeddings', async () => {
      await service.buildJobEmbedding(1)
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledTimes(2)
      expect(mockAIMatchingRepo.updateJobEmbeddings).toHaveBeenCalledWith(1, fakeVector, fakeVector)
    })

    it('throws NotFoundException when job not found', async () => {
      mockJobService.getDetail.mockResolvedValue(null)
      await expect(service.buildJobEmbedding(99)).rejects.toThrow(NotFoundException)
    })

    it('swallows embedding error silently', async () => {
      mockEmbeddingService.extractJobSections.mockRejectedValue(new Error('AI unavailable'))
      await expect(service.buildJobEmbedding(1)).resolves.not.toThrow()
    })

    it('skips benefit embedding when buildJobBenefitText returns null', async () => {
      mockEmbeddingTextBuilder.buildJobBenefitText.mockReturnValue(null)
      await service.buildJobEmbedding(1)
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledTimes(1)
      expect(mockAIMatchingRepo.updateJobEmbeddings).toHaveBeenCalledWith(1, fakeVector, null)
    })
  })

  // ── buildWorkerProfileEmbedding ───────────────────────────────────────────

  describe('buildWorkerProfileEmbedding', () => {
    it('builds and stores worker embeddings', async () => {
      await service.buildWorkerProfileEmbedding(1)
      expect(mockAIMatchingRepo.updateWorkerEmbeddings).toHaveBeenCalledWith(1, fakeVector, fakeVector)
    })

    it('throws NotFoundException when worker profile not found', async () => {
      mockUserService.getWorkerProfile.mockResolvedValue(null)
      await expect(service.buildWorkerProfileEmbedding(99)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when profile has no occupation', async () => {
      mockUserService.getWorkerProfile.mockResolvedValue({ ...workerProfile, occupation: null })
      await expect(service.buildWorkerProfileEmbedding(1)).rejects.toThrow(BadRequestException)
    })

    it('swallows embedding error silently', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('AI error'))
      await expect(service.buildWorkerProfileEmbedding(1)).resolves.not.toThrow()
    })

    it('passes null culture embedding when no cultureText', async () => {
      mockEmbeddingTextBuilder.buildCultureText.mockReturnValue(null)
      await service.buildWorkerProfileEmbedding(1)
      expect(mockAIMatchingRepo.updateWorkerEmbeddings).toHaveBeenCalledWith(1, fakeVector, null)
    })
  })

  // ── getConfigs (cached) ───────────────────────────────────────────────────

  describe('getConfigs', () => {
    it('fetches from repository on cache miss', async () => {
      const result = await service.getConfigs()
      expect(mockAIMatchingRepo.getConfigs).toHaveBeenCalled()
      expect(mockRedis.set).toHaveBeenCalled()
      expect(result).toBe(configs)
    })

    it('returns cached value without hitting repository', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(configs))
      const result = await service.getConfigs()
      expect(mockAIMatchingRepo.getConfigs).not.toHaveBeenCalled()
      expect(result).toEqual(configs)
    })
  })

  // ── updateConfigs ─────────────────────────────────────────────────────────

  describe('updateConfigs', () => {
    const validWeightConfigs = configs.filter((c) => c.key !== MatchingConfigKey.MIN_SCORE_THRESHOLD)

    it('updates configs and invalidates cache', async () => {
      mockAIMatchingRepo.updateConfigs.mockResolvedValue(configs)
      await service.updateConfigs(configs)
      expect(mockRedis.del).toHaveBeenCalledWith('ai:configs')
    })

    it('throws when weight sum is not exactly 1', async () => {
      const badConfigs = validWeightConfigs.map((c) => ({ ...c, value: 0.2 })) // sum = 1.4
      await expect(service.updateConfigs(badConfigs)).rejects.toThrow(BadRequestException)
    })

    it('throws when MIN_SCORE_THRESHOLD is out of range', async () => {
      const badConfigs = [{ key: MatchingConfigKey.MIN_SCORE_THRESHOLD, value: 1.5 }]
      await expect(service.updateConfigs(badConfigs)).rejects.toThrow(BadRequestException)
    })

    it('allows MIN_SCORE_THRESHOLD = 0', async () => {
      mockAIMatchingRepo.updateConfigs.mockResolvedValue([])
      const thresholdOnly = [{ key: MatchingConfigKey.MIN_SCORE_THRESHOLD, value: 0 }]
      await expect(service.updateConfigs(thresholdOnly)).resolves.not.toThrow()
    })
  })
})
