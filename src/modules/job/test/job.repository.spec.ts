import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { JobRepository } from '../repositories/job.repository'
import { JobApplicationStatus, JobStatus, ReportStatus, OrderType } from 'src/generated/prisma/enums'

// ─── TX mock ──────────────────────────────────────────────────────────────────
const mockTx = {
  job: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  company: { update: jest.fn() },
  notification: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  jobApplication: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  interviewInvitation: { create: jest.fn() },
  interviewInvitationCampaign: { update: jest.fn() },
  savedJob: { findMany: jest.fn(), count: jest.fn() },
  jobReport: { findMany: jest.fn(), count: jest.fn() },
}

// ─── Prisma mock ──────────────────────────────────────────────────────────────
const mockPrisma: any = {
  occupation: { findUnique: jest.fn() },
  job: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  company: { findUnique: jest.fn(), update: jest.fn() },
  jobApplication: { update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  jobView: { create: jest.fn(), findFirst: jest.fn() },
  paymentPackage: { findMany: jest.fn(), findFirst: jest.fn() },
  savedJob: { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  jobReport: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  notification: { create: jest.fn() },
  user: { findMany: jest.fn() },
  interviewInvitation: { findMany: jest.fn(), findFirst: jest.fn() },
  interviewInvitationSlot: { findFirst: jest.fn() },
  interviewInvitationCampaign: { findFirst: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
}

describe('JobRepository', () => {
  let repo: JobRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return Promise.all(arg)
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    repo = module.get<JobRepository>(JobRepository)
  })

  // ── createJobWithForm ─────────────────────────────────────────────────────

  describe('createJobWithForm', () => {
    it('throws BadRequestException when occupation not found', async () => {
      mockPrisma.occupation.findUnique.mockResolvedValue(null)
      await expect(repo.createJobWithForm({ jobData: { occupationId: 99 } })).rejects.toThrow(BadRequestException)
    })

    it('creates job when occupation exists', async () => {
      mockPrisma.occupation.findUnique.mockResolvedValue({ id: 1 })
      mockPrisma.job.create.mockResolvedValue({ id: 10 })
      const result = await repo.createJobWithForm({ jobData: { occupationId: 1, title: 'Dev' } })
      expect(result).toEqual({ id: 10 })
    })
  })

  // ── isFirstJobPostFree ────────────────────────────────────────────────────

  describe('isFirstJobPostFree', () => {
    it('returns true when firstJobPostUsedAt is null', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ firstJobPostUsedAt: null })
      expect(await repo.isFirstJobPostFree(1)).toBe(true)
    })

    it('returns false when firstJobPostUsedAt is set', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ firstJobPostUsedAt: new Date() })
      expect(await repo.isFirstJobPostFree(1)).toBe(false)
    })

    it('throws BadRequestException when company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null)
      await expect(repo.isFirstJobPostFree(999)).rejects.toThrow(BadRequestException)
    })
  })

  // ── publishFirstJobForFree ────────────────────────────────────────────────

  describe('publishFirstJobForFree', () => {
    it('updates company and job in transaction', async () => {
      mockTx.company.update.mockResolvedValue({ ownerId: 5 })
      mockTx.job.update.mockResolvedValue({ id: 1, title: 'Dev' })
      mockTx.notification.create.mockResolvedValue({})
      const result = await repo.publishFirstJobForFree(1, 1)
      expect(mockTx.company.update).toHaveBeenCalled()
      expect(mockTx.job.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: JobStatus.PUBLISHED } }))
      expect(result).toEqual({ id: 1, title: 'Dev' })
    })
  })

  // ── publishJobByPoint ─────────────────────────────────────────────────────

  describe('publishJobByPoint', () => {
    it('publishes job and sends notification', async () => {
      mockTx.job.update.mockResolvedValue({ id: 1, title: 'Dev', company: { ownerId: 5 } })
      mockTx.notification.create.mockResolvedValue({})
      await repo.publishJobByPoint(1)
      expect(mockTx.notification.create).toHaveBeenCalled()
    })
  })

  // ── activateBoostByPoint ──────────────────────────────────────────────────

  describe('activateBoostByPoint', () => {
    it('sets new boost when no existing boost', async () => {
      mockTx.job.findUnique.mockResolvedValue({ boostExpiredAt: null, title: 'Dev', company: { ownerId: 5 } })
      mockTx.job.update.mockResolvedValue({ id: 1 })
      mockTx.notification.create.mockResolvedValue({})
      await repo.activateBoostByPoint({ jobId: 1, durationDays: 7 })
      expect(mockTx.job.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isBoosted: true }) }),
      )
    })

    it('extends boost when existing boost is still active', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 3)
      mockTx.job.findUnique.mockResolvedValue({ boostExpiredAt: futureDate, title: 'Dev', company: { ownerId: 5 } })
      mockTx.job.update.mockResolvedValue({ id: 1 })
      mockTx.notification.create.mockResolvedValue({})
      await repo.activateBoostByPoint({ jobId: 1, durationDays: 7 })
      const updateCall = mockTx.job.update.mock.calls[0][0]
      // boostExpiredAt should be futureDate + 7 days
      expect(updateCall.data.boostExpiredAt > futureDate).toBe(true)
    })
  })

  // ── searchJobs ────────────────────────────────────────────────────────────

  describe('searchJobs', () => {
    it('returns paginated search results', async () => {
      mockPrisma.$transaction.mockResolvedValue([[{ id: 1 }], 1])
      const result = await repo.searchJobs({}, { createdAt: 'desc' }, 10, 0)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('prepends isBoosted:desc to array orderBy', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      await repo.searchJobs({}, [{ createdAt: 'desc' }], 10, 0)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  // ── deactivateExpiredBoosts ───────────────────────────────────────────────

  describe('deactivateExpiredBoosts', () => {
    it('calls updateMany on expired boosted jobs', async () => {
      mockPrisma.job.updateMany.mockResolvedValue({ count: 3 })
      const result = await repo.deactivateExpiredBoosts()
      expect(mockPrisma.job.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isBoosted: false, boostExpiredAt: null } }),
      )
      expect(result).toEqual({ count: 3 })
    })
  })

  // ── getJobsByCompanyId ────────────────────────────────────────────────────

  describe('getJobsByCompanyId', () => {
    it('adds take/skip when limit and skip are provided', async () => {
      mockPrisma.$transaction.mockResolvedValue([[{ id: 1 }], 1])
      mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([])
      await repo.getJobsByCompanyId({ companyId: 1, limit: 10, skip: 0 })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('omits take/skip when not provided', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([])
      await repo.getJobsByCompanyId({ companyId: 1 })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  // ── getActiveBoostPackages ────────────────────────────────────────────────

  describe('getActiveBoostPackages', () => {
    it('returns active boost packages', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([{ id: 1 }])
      const result = await repo.getActiveBoostPackages()
      expect(mockPrisma.paymentPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderType: OrderType.BOOST_JOB, isActive: true } }),
      )
      expect(result).toHaveLength(1)
    })
  })

  // ── getBoostPackageByDays ─────────────────────────────────────────────────

  describe('getBoostPackageByDays', () => {
    it('finds package matching duration', async () => {
      mockPrisma.paymentPackage.findFirst.mockResolvedValue({ id: 1, durationDays: 7 })
      const result = await repo.getBoostPackageByDays(7)
      expect(result?.durationDays).toBe(7)
    })
  })

  // ── getDefaultFeatureListingPackage ───────────────────────────────────────

  describe('getDefaultFeatureListingPackage', () => {
    it('returns default package when found', async () => {
      mockPrisma.paymentPackage.findFirst.mockResolvedValue({ id: 1, isDefault: true })
      const result = await repo.getDefaultFeatureListingPackage()
      expect(result?.isDefault).toBe(true)
    })

    it('falls back to any active package when no default', async () => {
      mockPrisma.paymentPackage.findFirst
        .mockResolvedValueOnce(null)       // no default
        .mockResolvedValue({ id: 2, isDefault: false })
      const result = await repo.getDefaultFeatureListingPackage()
      expect(result?.id).toBe(2)
    })
  })

  // ── recordView ────────────────────────────────────────────────────────────

  describe('recordView', () => {
    it('does not create view when IP already viewed in 24h', async () => {
      mockPrisma.jobView.findFirst.mockResolvedValue({ id: 1 })
      await repo.recordView(1, '192.168.1.1')
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('creates view and increments viewCount for new IP', async () => {
      mockPrisma.jobView.findFirst.mockResolvedValue(null)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])
      await repo.recordView(1, '10.0.0.1')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  // ── applyJob ──────────────────────────────────────────────────────────────

  describe('applyJob', () => {
    beforeEach(() => {
      mockTx.jobApplication.findUnique.mockResolvedValue(null) // new applicant
      mockTx.jobApplication.create.mockResolvedValue({ id: 99 })
      mockTx.jobApplication.findUnique
        .mockResolvedValueOnce(null) // existing check
        .mockResolvedValue({ id: 99, jobId: 1, userId: 2 }) // after create
      mockTx.job.findUnique.mockResolvedValue({ title: 'Dev', company: { ownerId: 10 } })
      mockTx.jobApplication.count.mockResolvedValue(1)
      mockTx.notification.findFirst.mockResolvedValue(null)
      mockTx.notification.create.mockResolvedValue({})
    })

    it('creates new application for first-time applicant', async () => {
      await repo.applyJob({ jobId: 1, userId: 2 })
      expect(mockTx.jobApplication.create).toHaveBeenCalled()
    })

    it('throws BadRequestException when application is not cancelled', async () => {
      mockTx.jobApplication.findUnique.mockReset()
      mockTx.jobApplication.findUnique.mockResolvedValue({ id: 5, status: JobApplicationStatus.APPLIED })
      await expect(repo.applyJob({ jobId: 1, userId: 2 })).rejects.toThrow(BadRequestException)
    })

    it('re-applies when previous was cancelled', async () => {
      mockTx.jobApplication.findUnique.mockReset()
      mockTx.jobApplication.findUnique
        .mockResolvedValueOnce({ id: 5, status: JobApplicationStatus.CANCELLED })
        .mockResolvedValue({ id: 5, jobId: 1, userId: 2 })
      mockTx.jobApplication.update.mockResolvedValue({})
      await repo.applyJob({ jobId: 1, userId: 2 })
      expect(mockTx.jobApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: JobApplicationStatus.APPLIED } }),
      )
    })

    it('updates existing notification instead of creating new one', async () => {
      mockTx.notification.findFirst.mockResolvedValue({ id: 20 })
      mockTx.notification.update.mockResolvedValue({})
      await repo.applyJob({ jobId: 1, userId: 2 })
      expect(mockTx.notification.update).toHaveBeenCalled()
    })
  })

  // ── cancelApply ───────────────────────────────────────────────────────────

  describe('cancelApply', () => {
    it('updates application status to CANCELLED', async () => {
      mockPrisma.jobApplication.update.mockResolvedValue({ id: 1, status: JobApplicationStatus.CANCELLED })
      await repo.cancelApply(1, 2)
      expect(mockPrisma.jobApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: JobApplicationStatus.CANCELLED } }),
      )
    })
  })

  // ── updateApplicationStatus ───────────────────────────────────────────────

  describe('updateApplicationStatus', () => {
    beforeEach(() => {
      mockPrisma.jobApplication.update.mockResolvedValue({})
      mockPrisma.$executeRaw.mockResolvedValue(1)
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        id: 1,
        userId: 2,
        jobId: 5,
        job: { title: 'Dev', companyId: 1 },
      })
      mockPrisma.notification.create.mockResolvedValue({})
    })

    it('uses executeRaw for VIEWED status', async () => {
      await repo.updateApplicationStatus(1, JobApplicationStatus.VIEWED)
      expect(mockPrisma.$executeRaw).toHaveBeenCalled()
    })

    it('uses standard update for non-VIEWED status', async () => {
      await repo.updateApplicationStatus(1, JobApplicationStatus.SUITABLE)
      expect(mockPrisma.jobApplication.update).toHaveBeenCalled()
    })

    it('sends notification for SUITABLE status', async () => {
      await repo.updateApplicationStatus(1, JobApplicationStatus.SUITABLE)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Hồ sơ phù hợp' }) }),
      )
    })

    it('sends notification for UNSUITABLE status', async () => {
      await repo.updateApplicationStatus(1, JobApplicationStatus.UNSUITABLE)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Hồ sơ chưa phù hợp' }) }),
      )
    })

    it('throws BadRequestException when application not found', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(null)
      await expect(repo.updateApplicationStatus(999, JobApplicationStatus.SUITABLE)).rejects.toThrow(BadRequestException)
    })
  })

  // ── checkExistingInvitation ───────────────────────────────────────────────

  describe('checkExistingInvitation', () => {
    it('returns true when active invitation exists', async () => {
      mockPrisma.interviewInvitation.findFirst.mockResolvedValue({ id: 1 })
      expect(await repo.checkExistingInvitation(1, 2)).toBe(true)
    })

    it('returns false when no invitation', async () => {
      mockPrisma.interviewInvitation.findFirst.mockResolvedValue(null)
      expect(await repo.checkExistingInvitation(1, 2)).toBe(false)
    })
  })

  // ── changeJobReportStatus ─────────────────────────────────────────────────

  describe('changeJobReportStatus', () => {
    const report = { id: 1, reporterId: 3, jobId: 5, job: { title: 'Dev' } }

    beforeEach(() => {
      mockPrisma.jobReport.update.mockResolvedValue(report)
      mockPrisma.notification.create.mockResolvedValue({})
    })

    it('sends notification on RESOLVED', async () => {
      await repo.changeJobReportStatus(1, ReportStatus.RESOLVED)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Báo cáo đã được giải quyết' }) }),
      )
    })

    it('sends notification on REJECTED', async () => {
      await repo.changeJobReportStatus(1, ReportStatus.REJECTED)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Báo cáo không được chấp nhận' }) }),
      )
    })

    it('does not send notification for PENDING', async () => {
      await repo.changeJobReportStatus(1, ReportStatus.PENDING)
      expect(mockPrisma.notification.create).not.toHaveBeenCalled()
    })
  })

  // ── updateJobStatus ───────────────────────────────────────────────────────

  describe('updateJobStatus', () => {
    const job = { id: 1, title: 'Dev', company: { ownerId: 5 } }

    beforeEach(() => {
      mockPrisma.job.update.mockResolvedValue(job)
      mockPrisma.notification.create.mockResolvedValue({})
    })

    it('sends approval notification when PUBLISHED', async () => {
      await repo.updateJobStatus(1, JobStatus.PUBLISHED)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Tin tuyển dụng đã được duyệt' }) }),
      )
    })

    it('sends warning notification when WARNING', async () => {
      await repo.updateJobStatus(1, JobStatus.WARNING)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Tin tuyển dụng chờ thanh toán' }) }),
      )
    })

    it('sends removal notification when DELETED', async () => {
      await repo.updateJobStatus(1, JobStatus.DELETED)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Tin tuyển dụng bị từ chối/gỡ bỏ' }) }),
      )
    })
  })

  // ── markExpiredJobs ───────────────────────────────────────────────────────

  describe('markExpiredJobs', () => {
    it('marks expired jobs', async () => {
      mockPrisma.job.updateMany.mockResolvedValue({ count: 2 })
      await repo.markExpiredJobs()
      expect(mockPrisma.job.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: JobStatus.EXPIRED } }),
      )
    })
  })

  // ── addWorkerToCampaign ───────────────────────────────────────────────────

  describe('addWorkerToCampaign', () => {
    it('creates invitation and updates campaign in transaction', async () => {
      mockTx.interviewInvitation.create.mockResolvedValue({ id: 5 })
      mockTx.interviewInvitationCampaign.update.mockResolvedValue({})
      mockTx.notification.create.mockResolvedValue({})
      const result = await repo.addWorkerToCampaign({
        campaignId: 10,
        workerId: 2,
        jobTitle: 'Dev',
        message: 'Come interview',
        slots: [],
      })
      expect(result).toEqual({ id: 5 })
    })
  })

  // ── createJobReport ───────────────────────────────────────────────────────

  describe('createJobReport', () => {
    it('creates report and notifies managers', async () => {
      mockPrisma.jobReport.create.mockResolvedValue({ id: 1, job: { title: 'Dev' } })
      mockPrisma.user.findMany.mockResolvedValue([{ id: 7 }, { id: 8 }])
      mockPrisma.notification.create.mockResolvedValue({})
      await repo.createJobReport(3, { jobId: 5, reason: 'FRAUD', description: 'Scam' })
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2)
    })
  })

  // ── simple delegate methods ───────────────────────────────────────────────

  it('deleteJob marks job as DELETED', async () => {
    mockPrisma.job.update.mockResolvedValue({ id: 1 })
    await repo.deleteJob(1)
    expect(mockPrisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: JobStatus.DELETED } }),
    )
  })

  it('findJobById returns job with relations', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({ id: 1 })
    const result = await repo.findJobById(1)
    expect(result).toEqual({ id: 1 })
  })

  it('findApplicationsByUser returns user applications', async () => {
    mockPrisma.jobApplication.findMany.mockResolvedValue([{ id: 1 }])
    const result = await repo.findApplicationsByUser(2)
    expect(result).toHaveLength(1)
  })

  it('getWishList returns paginated saved jobs', async () => {
    mockPrisma.$transaction.mockResolvedValue([[{ id: 1 }], 1])
    const result = await repo.getWishList({}, {}, 10, 0)
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('saveJob creates saved job record', async () => {
    mockPrisma.savedJob.create.mockResolvedValue({ id: 1 })
    await repo.saveJob(2, 5)
    expect(mockPrisma.savedJob.create).toHaveBeenCalledWith({ data: { userId: 2, jobId: 5 } })
  })

  it('unSaveJob deletes saved job record', async () => {
    mockPrisma.savedJob.delete.mockResolvedValue({ id: 1 })
    await repo.unSaveJob(2, 5)
    expect(mockPrisma.savedJob.delete).toHaveBeenCalled()
  })

  it('getBoostedJobs returns active boosted jobs', async () => {
    mockPrisma.$transaction.mockResolvedValue([[{ id: 1, isBoosted: true }], 1])
    const result = await repo.getBoostedJobs(5, 0)
    expect(result.total).toBe(1)
  })

  it('getLastInterviewSlotByJob returns latest slot', async () => {
    mockPrisma.interviewInvitationSlot.findFirst.mockResolvedValue({ id: 1, endAt: new Date() })
    const result = await repo.getLastInterviewSlotByJob(5)
    expect(result?.id).toBe(1)
  })

  it('getWarningJobs returns paginated warning jobs', async () => {
    mockPrisma.$transaction.mockResolvedValue([[{ id: 1 }], 1])
    const result = await repo.getWarningJobs(1, 10)
    expect(result.total).toBe(1)
  })

  it('getAllJobReport returns paginated reports', async () => {
    mockPrisma.$transaction.mockResolvedValue([[{ id: 1 }], 1])
    const result = await repo.getAllJobReport(1, ReportStatus.PENDING, 1, 10)
    expect(result.total).toBe(1)
  })

  it('getAllJobReport applies date range filters', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0])
    await repo.getAllJobReport(1, 'ALL', 1, 10, 'CompanyX', 'Reporter', '2025-01-01', '2025-01-31')
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})
