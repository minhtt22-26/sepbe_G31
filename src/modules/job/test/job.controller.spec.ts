import { Test, TestingModule } from '@nestjs/testing'
import { JobService } from '../service/job.service'
import { JobController } from '../controller/job.controller'

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}))

const jobServiceMock = {
  getApplyForm: jest.fn(),
  applyJob: jest.fn(),
  cancelApplyJob: jest.fn(),
  getApplicationsByUser: jest.fn(),
  getDetail: jest.fn(),
  getRelatedJobs: jest.fn(),
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
      ],
    }).compile()

    controller = module.get<JobController>(JobController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('getApplyForm should call service.getApplyForm', async () => {
    const expected = { success: true, data: { formId: 10 } }
    jobServiceMock.getApplyForm.mockResolvedValue(expected)

    const result = await controller.getApplyForm(1)

    expect(result).toBe(expected)
    expect(jobServiceMock.getApplyForm).toHaveBeenCalledWith(1)
  })

  it('applyJob should call service.applyJob', async () => {
    const body = { answers: [{ fieldId: 1, value: 'a' }] }
    const expected = { success: true, data: { id: 200 } }
    jobServiceMock.applyJob.mockResolvedValue(expected)

    const result = await controller.applyJob(5, body, 42)

    expect(result).toBe(expected)
    expect(jobServiceMock.applyJob).toHaveBeenCalledWith(5, 42, body)
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

      const result = await controller.getDetail(1)

      expect(result).toEqual(mockJob)
      expect(jobServiceMock.getDetail).toHaveBeenCalledWith(1)
    })

    it('Abnormal: should throw error when job not found', async () => {
      const error = new Error('Job not found')
      jobServiceMock.getDetail.mockRejectedValue(error)

      await expect(controller.getDetail(1)).rejects.toThrow('Job not found')
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
})
