import { Test, TestingModule } from '@nestjs/testing'
import { StatisticsRepository } from './statistics.repository'
import { PrismaService } from 'src/prisma.service'
import { JobApplicationStatus, JobStatus, PaymentStatus } from 'src/generated/prisma/enums'

const mockPrisma = {
  job: {
    aggregate: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  jobApplication: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  interviewInvitationCampaign: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
}

describe('StatisticsRepository', () => {
  let repo: StatisticsRepository

  beforeEach(async () => {
    jest.clearAllMocks()

    mockPrisma.$transaction.mockImplementation((arr: any[]) => Promise.all(arr))

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    repo = module.get<StatisticsRepository>(StatisticsRepository)
  })

  // ── getOverview ───────────────────────────────────────────────────────────

  describe('getOverview', () => {
    beforeEach(() => {
      mockPrisma.job.aggregate.mockResolvedValue({ _sum: { viewCount: 500 } })
      mockPrisma.jobApplication.count.mockResolvedValue(20)
      mockPrisma.job.count.mockResolvedValue(5)
      mockPrisma.jobApplication.findMany.mockResolvedValue([])
    })

    it('returns overview with correct shape', async () => {
      const result = await repo.getOverview(1)
      expect(result).toHaveProperty('totalViews')
      expect(result).toHaveProperty('totalApplications')
      expect(result).toHaveProperty('conversionRate')
      expect(result).toHaveProperty('activeJobs')
      expect(result).toHaveProperty('newJobsThisWeek')
      expect(result).toHaveProperty('hasInterviewWarning')
    })

    it('calculates changePercent correctly when previous is 0', async () => {
      mockPrisma.job.aggregate
        .mockResolvedValueOnce({ _sum: { viewCount: 100 } }) // current
        .mockResolvedValueOnce({ _sum: { viewCount: 0 } })   // previous = 0
      const result = await repo.getOverview(1)
      expect(result.totalViews.changePercent).toBe(100)
    })

    it('calculates changePercent as 0 when both current and previous are 0', async () => {
      mockPrisma.job.aggregate.mockResolvedValue({ _sum: { viewCount: 0 } })
      mockPrisma.jobApplication.count.mockResolvedValue(0)
      const result = await repo.getOverview(1)
      expect(result.totalViews.changePercent).toBe(0)
    })

    it('sets hasInterviewWarning true when suitable jobs lack interview schedule', async () => {
      mockPrisma.jobApplication.findMany.mockResolvedValue([
        { jobId: 5 }, { jobId: 6 },
      ])
      mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([
        { jobId: 5 }, // only job 5 has scheduled campaign → job 6 is missing
      ])
      const result = await repo.getOverview(1)
      expect(result.hasInterviewWarning).toBe(true)
    })

    it('sets hasInterviewWarning false when all suitable jobs have interview schedule', async () => {
      mockPrisma.jobApplication.findMany.mockResolvedValue([{ jobId: 5 }])
      mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([{ jobId: 5 }])
      const result = await repo.getOverview(1)
      expect(result.hasInterviewWarning).toBe(false)
    })
  })

  // ── getJobEngagementStatistic ─────────────────────────────────────────────

  describe('getJobEngagementStatistic', () => {
    it('returns empty timeline when no date range', async () => {
      const result = await repo.getJobEngagementStatistic(1, {})
      expect(result.timeline).toHaveLength(0)
    })

    it('builds timeline when date range provided', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([])
      const result = await repo.getJobEngagementStatistic(1, {
        from: '2025-01-01',
        to: '2025-01-03',
      })
      expect(result.timeline).toHaveLength(3)
      expect(result.timeline[0].period).toBe('2025-01-01')
    })

    it('merges view and application counts into timeline', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ period: '2025-01-01', count: 10 }]) // views
        .mockResolvedValueOnce([{ period: '2025-01-01', count: 5 }])  // apps
      const result = await repo.getJobEngagementStatistic(1, { from: '2025-01-01', to: '2025-01-01' })
      expect(result.timeline[0].views).toBe(10)
      expect(result.timeline[0].applications).toBe(5)
    })
  })

  // ── getJobStatistic ───────────────────────────────────────────────────────

  describe('getJobStatistic', () => {
    it('returns funnel stats correctly', async () => {
      mockPrisma.jobApplication.groupBy.mockResolvedValue([
        { status: JobApplicationStatus.APPLIED, _count: { id: 20 } },
        { status: JobApplicationStatus.SUITABLE, _count: { id: 8 } },
      ])
      const result = await repo.getJobStatistic(1, 42)
      expect(result.applied).toBe(20)
      expect(result.suitable).toBe(8)
      expect(result.total).toBe(28)
    })
  })

  // ── getJobStatus ──────────────────────────────────────────────────────────

  describe('getJobStatus', () => {
    it('returns job status counts', async () => {
      mockPrisma.job.groupBy.mockResolvedValue([
        { status: JobStatus.PUBLISHED, _count: { id: 5 } },
        { status: JobStatus.EXPIRED, _count: { id: 2 } },
        { status: JobStatus.WARNING, _count: { id: 1 } },
      ])
      const result = await repo.getJobStatus(1)
      expect(result.published).toBe(5)
      expect(result.expired).toBe(2)
      expect(result.warning).toBe(1)
      expect(result.total).toBe(8)
    })

    it('returns zeros when no jobs', async () => {
      mockPrisma.job.groupBy.mockResolvedValue([])
      const result = await repo.getJobStatus(1)
      expect(result.published).toBe(0)
      expect(result.total).toBe(0)
    })
  })
})
