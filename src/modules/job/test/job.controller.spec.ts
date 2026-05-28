import { Test, TestingModule } from '@nestjs/testing'
import { JobService } from '../service/job.service'
import { JobController } from '../controller/job.controller'
import { CompanyService } from 'src/modules/company/company.service'

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}))

const jobServiceMock = {
  applyJob: jest.fn(),
  cancelApplyJob: jest.fn(),
  getApplicationsByUser: jest.fn(),
  getDetail: jest.fn(),
  getRelatedJobs: jest.fn(),
  // extended
  searchJobs: jest.fn(),
  getBoostedJobs: jest.fn(),
  getBoostPackages: jest.fn(),
  handleSepayWebhook: jest.fn(),
  getJobsByEmployer: jest.fn(),
  createJob: jest.fn(),
  getWistlist: jest.fn(),
  getSuitableApplications: jest.fn(),
  getApplicationsForEmployer: jest.fn(),
  updateApplicationStatus: jest.fn(),
  updateJob: jest.fn(),
  createBoostCheckout: jest.fn(),
  createJobPostingCheckout: jest.fn(),
  confirmBoostPayment: jest.fn(),
  deleteJob: jest.fn(),
  saveJob: jest.fn(),
  unSaveJob: jest.fn(),
  reportJob: jest.fn(),
  getAllJobReport: jest.fn(),
  changeJobReportStatus: jest.fn(),
  getWarningJobs: jest.fn(),
  updateJobStatus: jest.fn(),
}

const companyServiceMock = {
  findByOwnerId: jest.fn(),
}

describe('JobController', () => {
  let controller: JobController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: JobService,
          useValue: jobServiceMock,
        },
        {
          provide: CompanyService,
          useValue: companyServiceMock,
        },
      ],
    }).compile()

    controller = module.get<JobController>(JobController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('applyJob should call service.applyJob', async () => {
    const expected = { success: true, data: { id: 200 } }
    jobServiceMock.applyJob.mockResolvedValue(expected)

    const result = await controller.applyJob(5, 42)

    expect(result).toBe(expected)
    expect(jobServiceMock.applyJob).toHaveBeenCalledWith(5, 42)
  })

  it('cancelApply should call service.cancelApplyJob', async () => {
    const expected = { success: true }
    jobServiceMock.cancelApplyJob.mockResolvedValue(expected)

    const result = await controller.cancelApply(5, 42)

    expect(result).toBe(expected)
    expect(jobServiceMock.cancelApplyJob).toHaveBeenCalledWith(5, 42)
  })

  it('getMyApplications should call service.getApplicationsByUser', async () => {
    const expected = { success: true, data: [] }
    jobServiceMock.getApplicationsByUser.mockResolvedValue(expected)

    const result = await controller.getMyApplications(42)

    expect(result).toBe(expected)
    expect(jobServiceMock.getApplicationsByUser).toHaveBeenCalledWith(42)
  })

  describe('getDetail', () => {
    it('Normal: should return job detail when job exists', async () => {
      const mockJob = { id: 1, title: 'Job 1' }
      jobServiceMock.getDetail.mockResolvedValue(mockJob)
      const result = await controller.getDetail(1, '127.0.0.1')

      expect(result).toEqual(mockJob)
      expect(jobServiceMock.getDetail).toHaveBeenCalledWith(1, '127.0.0.1')
    })

    it('Abnormal: should throw error when job not found', async () => {
      const error = new Error('Job not found')
      jobServiceMock.getDetail.mockRejectedValue(error)
      await expect(controller.getDetail(1, '127.0.0.1')).rejects.toThrow('Job not found')
    })
  })

  describe('getRelatedJobs', () => {
    it('Normal: should return related jobs list', async () => {
      const mockRelated = [{ id: 2 }, { id: 3 }]
      jobServiceMock.getRelatedJobs.mockResolvedValue(mockRelated)

      const result = await controller.getRelatedJobs(1)

      expect(result).toEqual(mockRelated)
      expect(jobServiceMock.getRelatedJobs).toHaveBeenCalledWith(1)
    })

    it('Abnormal: should handle service errors', async () => {
      jobServiceMock.getRelatedJobs.mockRejectedValue(
        new Error('Service Error'),
      )

      await expect(controller.getRelatedJobs(1)).rejects.toThrow(
        'Service Error',
      )
    })

    it('Boundary: should handle empty related jobs list', async () => {
      jobServiceMock.getRelatedJobs.mockResolvedValue([])
      const result = await controller.getRelatedJobs(1)
      expect(result).toEqual([])
    })
  })

  // ── additional endpoints ──────────────────────────────────────────────────

  const approvedCompany = { id: 5, ownerId: 1, status: 'APPROVED' as any }
  const user = { userId: 1 }

  it('search delegates to service', async () => {
    jobServiceMock.searchJobs.mockResolvedValue({ items: [], meta: {} })
    await controller.search({})
    expect(jobServiceMock.searchJobs).toHaveBeenCalled()
  })

  it('getBoostedJobs delegates to service', async () => {
    jobServiceMock.getBoostedJobs.mockResolvedValue({ items: [] })
    await controller.getBoostedJobs(1, 10)
    expect(jobServiceMock.getBoostedJobs).toHaveBeenCalledWith(1, 10)
  })

  it('getBoostPackages delegates to service', async () => {
    jobServiceMock.getBoostPackages.mockResolvedValue({ items: [] })
    await controller.getBoostPackages()
    expect(jobServiceMock.getBoostPackages).toHaveBeenCalled()
  })

  it('handleSepayWebhook delegates to service', async () => {
    jobServiceMock.handleSepayWebhook.mockResolvedValue({ success: true })
    await controller.handleSepayWebhook('key', {})
    expect(jobServiceMock.handleSepayWebhook).toHaveBeenCalled()
  })

  it('pingSepayWebhook returns reachable message', async () => {
    const result = await controller.pingSepayWebhook()
    expect(result.success).toBe(true)
  })

  it('getForEmployer delegates to service with companyId', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.getJobsByEmployer.mockResolvedValue({ items: [] })
    await controller.getForEmployer(user, {})
    expect(jobServiceMock.getJobsByEmployer).toHaveBeenCalledWith(5, expect.anything())
  })

  it('create throws when company not approved', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue({ id: 5, status: 'PENDING' })
    await expect(controller.create(user, {} as any)).rejects.toThrow()
  })

  it('create delegates to service when approved', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.createJob.mockResolvedValue({ success: true })
    await controller.create(user, {} as any)
    expect(jobServiceMock.createJob).toHaveBeenCalledWith(expect.anything(), 5)
  })

  it('getWishlist delegates to service', async () => {
    jobServiceMock.getWistlist.mockResolvedValue({ items: [] })
    await controller.getWishlist({ page: 1, limit: 10, skip: 0 }, user)
    expect(jobServiceMock.getWistlist).toHaveBeenCalledWith(1, 1, 10, 0)
  })

  it('getSuitableApplications delegates to service', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.getSuitableApplications.mockResolvedValue({ applications: [] })
    await controller.getSuitableApplications(user, 42)
    expect(jobServiceMock.getSuitableApplications).toHaveBeenCalled()
  })

  it('getApplicationsForEmployer throws on invalid jobId', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    await expect(controller.getApplicationsForEmployer(user, 'abc')).rejects.toThrow()
  })

  it('getApplicationsForEmployer delegates when valid jobId', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.getApplicationsForEmployer.mockResolvedValue([])
    await controller.getApplicationsForEmployer(user, '42')
    expect(jobServiceMock.getApplicationsForEmployer).toHaveBeenCalledWith(5, 42)
  })

  it('updateApplicationStatus delegates to service', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.updateApplicationStatus.mockResolvedValue({})
    await controller.updateApplicationStatus(user, 10, { status: 'SUITABLE' })
    expect(jobServiceMock.updateApplicationStatus).toHaveBeenCalledWith(10, 5, 'SUITABLE')
  })

  it('update delegates to service when company approved', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.updateJob.mockResolvedValue({ success: true })
    await controller.update(user, 1, {})
    expect(jobServiceMock.updateJob).toHaveBeenCalledWith(1, expect.anything(), 5)
  })

  it('delete delegates to service when company approved', async () => {
    companyServiceMock.findByOwnerId.mockResolvedValue(approvedCompany)
    jobServiceMock.deleteJob.mockResolvedValue({ success: true })
    await controller.delete(user, 1)
    expect(jobServiceMock.deleteJob).toHaveBeenCalledWith(1, 5)
  })

  it('saveJob delegates to service', async () => {
    jobServiceMock.saveJob.mockResolvedValue({ success: true })
    await controller.saveJob('5', user)
    expect(jobServiceMock.saveJob).toHaveBeenCalledWith(1, 5)
  })

  it('unSaveJob delegates to service', async () => {
    jobServiceMock.unSaveJob.mockResolvedValue({ success: true })
    await controller.unSaveJob('5', user)
    expect(jobServiceMock.unSaveJob).toHaveBeenCalledWith(1, 5)
  })
})
