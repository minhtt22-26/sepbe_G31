import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { JobRepository } from '../repositories/job.repository'
import { JobApplicationStatus, JobStatus } from 'src/generated/prisma/enums'
import { JobService } from '../service/job.service'
import { SepayService } from '../service/sepay.service'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
import { WalletService } from 'src/modules/wallet/wallet.service'
import { InterviewInvitationService } from 'src/modules/interview-invitation/service/interview-invitation.service'


jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}))

const jobRepositoryMock = {
  findJobWithApplyForm: jest.fn(),
  applyJob: jest.fn(),
  findApplicationByJobAndUser: jest.fn(),
  cancelApply: jest.fn(),
  findApplicationsByUser: jest.fn(),
  findJobById: jest.fn(),
  getRelatedJobs: jest.fn(),
  recordView: jest.fn(),
  // extended
  searchJobs: jest.fn(),
  deactivateExpiredBoosts: jest.fn(),
  getBoostedJobs: jest.fn(),
  createJobWithForm: jest.fn(),
  isFirstJobPostFree: jest.fn(),
  publishFirstJobForFree: jest.fn(),
  publishJobByPoint: jest.fn(),
  activateBoostByPoint: jest.fn(),
  updateJobFull: jest.fn(),
  deleteJob: jest.fn(),
  getLastInterviewSlotByJob: jest.fn(),
  getWishList: jest.fn(),
  findSavedJob: jest.fn(),
  saveJob: jest.fn(),
  unSaveJob: jest.fn(),
}

const sepayServiceMock = {
  buildBoostCheckout: jest.fn(),
  ensureCheckoutConfig: jest.fn(),
  extractOrderIdFromPayload: jest.fn(),
  isValidWebhookAuthorization: jest.fn(),
}

const aiMatchingServiceMock = {
  syncJobApplications: jest.fn(),
  buildJobEmbedding: jest.fn(),
}

const walletServiceMock = {
  getPointCost: jest.fn(),
  deductPoints: jest.fn(),
  resolveBoostPackage: jest.fn(),
  getBoostPackagesForEmployer: jest.fn(),
}

const interviewInvitationServiceMock = {}


describe('JobService', () => {
  let service: JobService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: JobRepository,
          useValue: jobRepositoryMock,
        },
        {
          provide: SepayService,
          useValue: sepayServiceMock,
        },
        {
          provide: AIMatchingService,
          useValue: aiMatchingServiceMock,
        },
        {
          provide: WalletService,
          useValue: walletServiceMock,
        },
        {
          provide: InterviewInvitationService,
          useValue: interviewInvitationServiceMock,
        },
      ],
    }).compile()

    service = module.get<JobService>(JobService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })



  it('applyJob should call repository when payload is valid', async () => {
    jobRepositoryMock.findJobById.mockResolvedValue({
      id: 1,
      status: JobStatus.PUBLISHED,
    })
    jobRepositoryMock.applyJob.mockResolvedValue({
      id: 200,
      status: JobApplicationStatus.APPLIED,
    })

    const result = await service.applyJob(1, 2)

    expect(result.success).toBe(true)
    expect(jobRepositoryMock.applyJob).toHaveBeenCalledWith({
      jobId: 1,
      userId: 2,
    })
  })

  it('cancelApplyJob should throw if application not found', async () => {
    jobRepositoryMock.findApplicationByJobAndUser.mockResolvedValue(null)

    await expect(service.cancelApplyJob(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('cancelApplyJob should throw if already cancelled', async () => {
    jobRepositoryMock.findApplicationByJobAndUser.mockResolvedValue({
      id: 100,
      status: JobApplicationStatus.CANCELLED,
    })

    await expect(service.cancelApplyJob(1, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('cancelApplyJob should cancel when status is APPLIED', async () => {
    jobRepositoryMock.findApplicationByJobAndUser.mockResolvedValue({
      id: 100,
      status: JobApplicationStatus.APPLIED,
    })
    jobRepositoryMock.cancelApply.mockResolvedValue({ id: 100 })

    const result = await service.cancelApplyJob(1, 2)

    expect(result).toEqual({ success: true })
    expect(jobRepositoryMock.cancelApply).toHaveBeenCalledWith(1, 2)
  })

  it('getApplicationsByUser should return applications for user', async () => {
    jobRepositoryMock.findApplicationsByUser.mockResolvedValue([
      {
        id: 200,
        status: JobApplicationStatus.APPLIED,
        job: { id: 10, title: 'Test Job', company: { id: 5, name: 'Acme' } },
      },
    ])

    const result = await service.getApplicationsByUser(2)

    expect(result.success).toBe(true)
    expect(jobRepositoryMock.findApplicationsByUser).toHaveBeenCalledWith(2)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data[0].job.id).toBe(10)
  })

  describe('getDetail', () => {
    const jobId = 1
    const mockJob = { id: jobId, title: 'Test Job' }

    const ipAddress = '127.0.0.1'

    it('Normal: should return job detail when job exists', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(mockJob)

      const result = await service.getDetail(jobId, ipAddress)

      expect(result).toEqual(mockJob)
      expect(jobRepositoryMock.findJobById).toHaveBeenCalledWith(jobId)
    })

    it('Abnormal: should throw Error when job is not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)

      await expect(service.getDetail(jobId, ipAddress)).rejects.toThrow('Job not found')
    })

    it('Boundary: should propagate database error', async () => {
      const dbError = new Error('Database connection failed')
      jobRepositoryMock.findJobById.mockRejectedValue(dbError)

      await expect(service.getDetail(jobId, ipAddress)).rejects.toThrow(dbError)
    })
  })

  describe('getRelatedJobs', () => {
    const jobId = 1
    const mockJob = { id: jobId, occupationId: 5, province: 'Hanoi' }
    const mockRelatedJobs = [
      { id: 2, title: 'Related Job 1' },
      { id: 3, title: 'Related Job 2' },
    ]

    it('Normal: should return related jobs when original job exists', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(mockJob)
      jobRepositoryMock.getRelatedJobs.mockResolvedValue(mockRelatedJobs)

      const result = await service.getRelatedJobs(jobId)

      expect(result).toEqual(mockRelatedJobs)
      expect(jobRepositoryMock.findJobById).toHaveBeenCalledWith(jobId)
      expect(jobRepositoryMock.getRelatedJobs).toHaveBeenCalledWith(
        jobId,
        mockJob.occupationId,
        mockJob.province,
        expect.any(Number),
      )
    })

    it('Abnormal: should throw NotFoundException when job is not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)

      await expect(service.getRelatedJobs(jobId)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.getRelatedJobs(jobId)).rejects.toThrow(
        'Không tìm thấy công việc này',
      )
    })

    it('Boundary: should return empty list when no related jobs found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(mockJob)
      jobRepositoryMock.getRelatedJobs.mockResolvedValue([])

      const result = await service.getRelatedJobs(jobId)

      expect(result).toEqual([])
    })
  })

  // ── searchJobs ────────────────────────────────────────────────────────────

  describe('searchJobs', () => {
    beforeEach(() => {
      jobRepositoryMock.deactivateExpiredBoosts.mockResolvedValue({})
      jobRepositoryMock.searchJobs.mockResolvedValue({ items: [{ id: 1 }], total: 1 })
    })

    it('returns paginated results with default sortBy', async () => {
      const result = await service.searchJobs({})
      expect(result.success).toBe(true)
      expect(result.items).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })

    it('sorts by salary_desc', async () => {
      await service.searchJobs({ sortBy: 'salary_desc' })
      expect(jobRepositoryMock.searchJobs).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.objectContaining({ salaryMax: 'desc' })]),
        expect.any(Number),
        expect.any(Number),
      )
    })

    it('sorts by salary_asc', async () => {
      await service.searchJobs({ sortBy: 'salary_asc' })
      expect(jobRepositoryMock.searchJobs).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.objectContaining({ salaryMax: 'asc' })]),
        expect.any(Number),
        expect.any(Number),
      )
    })

    it('sorts by view count', async () => {
      await service.searchJobs({ sortBy: 'view' })
      expect(jobRepositoryMock.searchJobs).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.objectContaining({ viewCount: 'desc' })]),
        expect.any(Number),
        expect.any(Number),
      )
    })

    it('applies keyword filter', async () => {
      await service.searchJobs({ keyword: 'dev' })
      const whereArg = jobRepositoryMock.searchJobs.mock.calls[0][0]
      expect(whereArg.OR).toBeDefined()
    })

    it('applies province and district filters', async () => {
      await service.searchJobs({ province: 'Hanoi', district: 'Cau Giay', workingShift: 'MORNING', occupationId: 2, genderRequirement: 'MALE', companyId: 3 })
      const whereArg = jobRepositoryMock.searchJobs.mock.calls[0][0]
      expect(whereArg.province).toBeDefined()
      expect(whereArg.district).toBeDefined()
    })
  })

  // ── getBoostedJobs ────────────────────────────────────────────────────────

  describe('getBoostedJobs', () => {
    it('returns shuffled boosted jobs', async () => {
      jobRepositoryMock.deactivateExpiredBoosts.mockResolvedValue({})
      jobRepositoryMock.getBoostedJobs.mockResolvedValue({ items: [{ id: 1 }, { id: 2 }], total: 2 })
      const result = await service.getBoostedJobs(1, 10)
      expect(result.success).toBe(true)
      expect(result.meta.total).toBe(2)
    })
  })

  // ── getBoostPackages ──────────────────────────────────────────────────────

  describe('getBoostPackages', () => {
    it('returns boost packages from wallet service', async () => {
      walletServiceMock.getBoostPackagesForEmployer.mockResolvedValue([{ id: 1 }, { id: 2 }])
      const result = await service.getBoostPackages()
      expect(result.success).toBe(true)
      expect(result.items).toHaveLength(2)
    })
  })

  // ── createBoostCheckout ───────────────────────────────────────────────────

  describe('createBoostCheckout', () => {
    const publishedJob = { id: 1, companyId: 1, status: JobStatus.PUBLISHED, boostExpiredAt: null }
    const boostPkg = { id: 1, name: 'Goi 7 ngay', durationDays: 7, price: 50000 }

    beforeEach(() => {
      jobRepositoryMock.findJobById.mockResolvedValue(publishedJob)
      walletServiceMock.resolveBoostPackage.mockResolvedValue(boostPkg)
      walletServiceMock.deductPoints.mockResolvedValue(undefined)
      jobRepositoryMock.activateBoostByPoint.mockResolvedValue({ id: 1, boostExpiredAt: new Date() })
    })

    it('boosts job and returns result', async () => {
      const result = await service.createBoostCheckout(1, 1, { packageDays: 7 } as any)
      expect(result.success).toBe(true)
      expect(result.data.packageDays).toBe(7)
    })

    it('throws NotFoundException when job not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.createBoostCheckout(99, 1, {} as any)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when job belongs to different company', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ ...publishedJob, companyId: 99 })
      await expect(service.createBoostCheckout(1, 1, {} as any)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when job is not published', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ ...publishedJob, status: JobStatus.WARNING })
      await expect(service.createBoostCheckout(1, 1, {} as any)).rejects.toThrow(BadRequestException)
    })
  })

  // ── createJobPostingCheckout ──────────────────────────────────────────────

  describe('createJobPostingCheckout', () => {
    const warningJob = { id: 1, companyId: 1, status: JobStatus.WARNING }

    beforeEach(() => {
      jobRepositoryMock.findJobById.mockResolvedValue(warningJob)
      walletServiceMock.getPointCost.mockResolvedValue(50000)
      walletServiceMock.deductPoints.mockResolvedValue(undefined)
      jobRepositoryMock.publishJobByPoint.mockResolvedValue({ id: 1 })
      aiMatchingServiceMock.buildJobEmbedding.mockResolvedValue(undefined)
    })

    it('publishes job and deducts points', async () => {
      const result = await service.createJobPostingCheckout(1, 1)
      expect(result.success).toBe(true)
      expect(result.data.pointCost).toBe(50000)
    })

    it('throws NotFoundException when job not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.createJobPostingCheckout(99, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when job already published', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ ...warningJob, status: JobStatus.PUBLISHED })
      await expect(service.createJobPostingCheckout(1, 1)).rejects.toThrow(BadRequestException)
    })
  })

  // ── handleSepayWebhook ────────────────────────────────────────────────────

  describe('handleSepayWebhook', () => {
    it('returns deprecated message without processing', async () => {
      const result = await service.handleSepayWebhook('apikey x', {})
      expect(result.success).toBe(true)
      expect(result.message).toContain('ngưng')
    })
  })

  // ── confirmBoostPayment ───────────────────────────────────────────────────

  describe('confirmBoostPayment', () => {
    it('returns deprecation message', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ id: 1, companyId: 1, status: JobStatus.PUBLISHED })
      const result = await service.confirmBoostPayment(1, 1, {} as any)
      expect(result.success).toBe(false)
    })

    it('throws NotFoundException when job not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.confirmBoostPayment(99, 1, {} as any)).rejects.toThrow(NotFoundException)
    })
  })

  // ── getWistlist ───────────────────────────────────────────────────────────

  describe('getWistlist', () => {
    it('returns wishlist with pagination', async () => {
      jobRepositoryMock.getWishList.mockResolvedValue({ items: [{ id: 1 }], total: 1 })
      const result = await service.getWistlist(2, 1, 10, 0)
      expect(result.success).toBe(true)
      expect(result.items).toHaveLength(1)
    })
  })

  // ── saveJob ───────────────────────────────────────────────────────────────

  describe('saveJob', () => {
    it('throws NotFoundException when job not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.saveJob(1, 99)).rejects.toThrow(NotFoundException)
    })

    it('returns already saved message when job already in wishlist', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ id: 1 })
      jobRepositoryMock.findSavedJob.mockResolvedValue({ id: 5 })
      const result = await service.saveJob(1, 1)
      expect(result.message).toContain('already saved')
    })

    it('saves job and returns success', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ id: 1 })
      jobRepositoryMock.findSavedJob.mockResolvedValue(null)
      jobRepositoryMock.saveJob.mockResolvedValue({})
      const result = await service.saveJob(1, 1)
      expect(result.success).toBe(true)
    })
  })

  // ── unSaveJob ─────────────────────────────────────────────────────────────

  describe('unSaveJob', () => {
    it('returns not saved message when job not in wishlist', async () => {
      jobRepositoryMock.findSavedJob.mockResolvedValue(null)
      const result = await service.unSaveJob(1, 1)
      expect(result.message).toContain('not saved')
    })

    it('removes saved job and returns success', async () => {
      jobRepositoryMock.findSavedJob.mockResolvedValue({ id: 5 })
      jobRepositoryMock.unSaveJob.mockResolvedValue({})
      const result = await service.unSaveJob(1, 1)
      expect(result.success).toBe(true)
    })
  })

  // ── createJob ─────────────────────────────────────────────────────────────

  describe('createJob', () => {
    const baseDto: any = { title: 'Dev', description: 'Desc', occupationId: 1, workingShift: 'MORNING', quantity: 2 }

    beforeEach(() => {
      jobRepositoryMock.createJobWithForm.mockResolvedValue({ id: 10, title: 'Dev' })
      jobRepositoryMock.isFirstJobPostFree.mockResolvedValue(false)
      jobRepositoryMock.publishJobByPoint.mockResolvedValue({ id: 10 })
      walletServiceMock.getPointCost.mockResolvedValue(50000)
      walletServiceMock.deductPoints.mockResolvedValue(undefined)
      aiMatchingServiceMock.buildJobEmbedding.mockResolvedValue(undefined)
    })

    it('throws when salaryMin > salaryMax', async () => {
      await expect(service.createJob({ ...baseDto, salaryMin: 10000000, salaryMax: 5000000 }, 1))
        .rejects.toThrow(BadRequestException)
    })

    it('throws when ageMin > ageMax', async () => {
      await expect(service.createJob({ ...baseDto, ageMin: 40, ageMax: 25 }, 1))
        .rejects.toThrow(BadRequestException)
    })

    it('throws when expiredAt is in the past', async () => {
      await expect(service.createJob({ ...baseDto, expiredAt: '2020-01-01' }, 1))
        .rejects.toThrow(BadRequestException)
    })

    it('publishes first job for free', async () => {
      jobRepositoryMock.isFirstJobPostFree.mockResolvedValue(true)
      jobRepositoryMock.publishFirstJobForFree.mockResolvedValue({})
      const result = await service.createJob(baseDto, 1)
      expect(result.data.payment.pointCost).toBe(0)
      expect(jobRepositoryMock.publishFirstJobForFree).toHaveBeenCalled()
    })

    it('deducts points and publishes for subsequent jobs', async () => {
      const result = await service.createJob(baseDto, 1)
      expect(result.success).toBe(true)
      expect(result.data.payment.pointCost).toBe(50000)
      expect(walletServiceMock.deductPoints).toHaveBeenCalled()
    })
  })

  // ── updateJob ─────────────────────────────────────────────────────────────

  describe('updateJob', () => {
    const publishedJob = { id: 1, companyId: 1, status: JobStatus.PUBLISHED, description: 'Old desc', occupationId: 5 }

    beforeEach(() => {
      jobRepositoryMock.findJobById.mockResolvedValue(publishedJob)
      jobRepositoryMock.updateJobFull.mockResolvedValue({ success: true, data: publishedJob })
      aiMatchingServiceMock.buildJobEmbedding.mockResolvedValue(undefined)
    })

    it('throws when job not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.updateJob(99, {} as any, 1)).rejects.toThrow()
    })

    it('rebuilds embedding when description changes', async () => {
      await service.updateJob(1, { description: 'New desc' } as any, 1)
      expect(aiMatchingServiceMock.buildJobEmbedding).toHaveBeenCalledWith(1)
    })

    it('does not rebuild embedding for non-content changes', async () => {
      await service.updateJob(1, { quantity: 5 } as any, 1)
      expect(aiMatchingServiceMock.buildJobEmbedding).not.toHaveBeenCalled()
    })
  })

  // ── deleteJob ─────────────────────────────────────────────────────────────

  describe('deleteJob', () => {
    const job = { id: 1, companyId: 1, status: JobStatus.PUBLISHED }

    it('throws when job not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.deleteJob(99, 1)).rejects.toThrow()
    })

    it('throws BadRequestException when future interview slot exists', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(job)
      jobRepositoryMock.getLastInterviewSlotByJob.mockResolvedValue({ endAt: new Date(Date.now() + 86400000) })
      await expect(service.deleteJob(1, 1)).rejects.toThrow(BadRequestException)
    })

    it('deletes job when no future slots', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(job)
      jobRepositoryMock.getLastInterviewSlotByJob.mockResolvedValue(null)
      jobRepositoryMock.deleteJob.mockResolvedValue({})
      const result = await service.deleteJob(1, 1)
      expect(result.success).toBe(true)
    })
  })

  // ── applyJob (extra cases) ────────────────────────────────────────────────

  describe('applyJob - extra', () => {
    it('throws NotFoundException when job does not exist', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)
      await expect(service.applyJob(99, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when job is not published', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue({ id: 1, status: JobStatus.WARNING })
      await expect(service.applyJob(1, 1)).rejects.toThrow(BadRequestException)
    })
  })
})
