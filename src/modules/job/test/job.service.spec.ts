import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { JobRepository } from '../repositories/job.repository'
import { JobApplicationStatus, JobStatus } from 'src/generated/prisma/enums'
import { JobService } from '../service/job.service'

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
}

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

  it('getApplyForm should throw when job not found', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue(null)

    await expect(service.getApplyForm(1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('getApplyForm should return first form fields', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue({
      id: 1,
      title: 'Công nhân may',
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [
            { id: 100, label: 'Họ tên', fieldType: 'text', isRequired: true },
          ],
        },
      ],
    })

    const result = await service.getApplyForm(1)

    expect(result.success).toBe(true)
    expect(result.data.formId).toBe(10)
  })

  it('applyJob should throw if required field is missing', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue({
      id: 1,
      title: 'Công nhân may',
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [
            {
              id: 100,
              label: 'Họ tên',
              fieldType: 'text',
              isRequired: true,
              options: null,
            },
          ],
        },
      ],
    })

    await expect(
      service.applyJob(1, 2, {
        answers: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('applyJob should call repository when payload is valid', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue({
      id: 1,
      title: 'Công nhân may',
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [
            {
              id: 100,
              label: 'Họ tên',
              fieldType: 'text',
              isRequired: true,
              options: null,
            },
            {
              id: 101,
              label: 'Ca làm',
              fieldType: 'select',
              isRequired: true,
              options: '["MORNING","AFTERNOON"]',
            },
          ],
        },
      ],
    })
    jobRepositoryMock.applyJob.mockResolvedValue({
      id: 200,
      status: JobApplicationStatus.APPLIED,
    })

    const result = await service.applyJob(1, 2, {
      answers: [
        { fieldId: 100, value: 'Nguyễn Văn A' },
        { fieldId: 101, value: 'MORNING' },
      ],
    })

    expect(result.success).toBe(true)
    expect(jobRepositoryMock.applyJob).toHaveBeenCalledWith({
      jobId: 1,
      userId: 2,
      answers: [
        { fieldId: 100, value: 'Nguyễn Văn A' },
        { fieldId: 101, value: 'MORNING' },
      ],
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
        answers: [
          {
            fieldId: 100,
            value: 'Nguyễn Văn A',
            field: {
              id: 100,
              label: 'Họ tên',
              fieldType: 'text',
              isRequired: true,
              options: null,
            },
          },
        ],
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

    it('Normal: should return job detail when job exists', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(mockJob)

      const result = await service.getDetail(jobId)

      expect(result).toEqual(mockJob)
      expect(jobRepositoryMock.findJobById).toHaveBeenCalledWith(jobId)
    })

    it('Abnormal: should throw Error when job is not found', async () => {
      jobRepositoryMock.findJobById.mockResolvedValue(null)

      await expect(service.getDetail(jobId)).rejects.toThrow('Job not found')
    })

    it('Boundary: should propagate database error', async () => {
      const dbError = new Error('Database connection failed')
      jobRepositoryMock.findJobById.mockRejectedValue(dbError)

      await expect(service.getDetail(jobId)).rejects.toThrow(dbError)
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
})
