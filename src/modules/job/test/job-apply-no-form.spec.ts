import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { JobService } from '../service/job.service'
import { JobRepository } from '../repositories/job.repository'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
import { SepayService } from '../service/sepay.service'
import { JobModerationService } from '../service/job-moderation.service'
import { JobStatus, JobApplicationStatus } from 'src/generated/prisma/enums'

describe('JobService - Apply without form', () => {
  let service: JobService
  let jobRepository: JobRepository

  const mockJobRepository = {
    findJobWithApplyForm: jest.fn(),
    findJobById: jest.fn(),
    applyJob: jest.fn(),
  }

  const mockAIMatchingService = {
    buildJobEmbedding: jest.fn(),
  }

  const mockSepayService = {
    buildBoostCheckout: jest.fn(),
    ensureCheckoutConfig: jest.fn(),
    extractOrderIdFromPayload: jest.fn(),
    isValidWebhookAuthorization: jest.fn(),
  }

  const mockJobModerationService = {
    moderateJobContent: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: JobRepository,
          useValue: mockJobRepository,
        },
        {
          provide: AIMatchingService,
          useValue: mockAIMatchingService,
        },
        {
          provide: SepayService,
          useValue: mockSepayService,
        },
        {
          provide: JobModerationService,
          useValue: mockJobModerationService,
        },
      ],
    }).compile()

    service = module.get<JobService>(JobService)
    jobRepository = module.get<JobRepository>(JobRepository)

    mockJobRepository.findJobById.mockResolvedValue({
      id: 1,
      status: JobStatus.PUBLISHED,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('applyJob without form', () => {
    const mockJobWithoutForm = {
      id: 1,
      status: JobStatus.PUBLISHED,
      applyForms: [],
    }

    it('should allow apply without form', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJobWithoutForm)
      mockJobRepository.applyJob.mockResolvedValue({
        id: 200,
        status: JobApplicationStatus.APPLIED,
      })

      const result = await service.applyJob(1, 2, { answers: [] })

      expect(result.success).toBe(true)
      expect(jobRepository.applyJob).toHaveBeenCalledWith({
        jobId: 1,
        userId: 2,
        answers: [],
      })
    })

    it('should allow apply with undefined answers', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJobWithoutForm)
      mockJobRepository.applyJob.mockResolvedValue({
        id: 200,
        status: JobApplicationStatus.APPLIED,
      })

      const result = await service.applyJob(1, 2, {})

      expect(result.success).toBe(true)
      expect(jobRepository.applyJob).toHaveBeenCalledWith({
        jobId: 1,
        userId: 2,
        answers: [],
      })
    })

    it('should validate form fields only if form exists', async () => {
      const mockJobWithForm = {
        id: 1,
        status: JobStatus.PUBLISHED,
        applyForms: [
          {
            id: 10,
            fields: [
              {
                id: 100,
                label: 'Name',
                fieldType: 'text',
                isRequired: true,
                options: null,
              },
            ],
          },
        ],
      }
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJobWithForm)

      await expect(
        service.applyJob(1, 2, { answers: [] })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('applyJob with empty form fields', () => {
    const mockJobWithEmptyForm = {
      id: 1,
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [],
        },
      ],
    }

    it('should allow apply when form has no fields', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJobWithEmptyForm)
      mockJobRepository.applyJob.mockResolvedValue({
        id: 200,
        status: JobApplicationStatus.APPLIED,
      })

      const result = await service.applyJob(1, 2, { answers: [] })

      expect(result.success).toBe(true)
    })
  })

  describe('applyJob validation edge cases', () => {
    const mockJob = {
      id: 1,
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [
            {
              id: 100,
              label: 'Name',
              fieldType: 'text',
              isRequired: false,
              options: null,
            },
            {
              id: 101,
              label: 'Skill',
              fieldType: 'select',
              isRequired: false,
              options: '["Java","Python","Go"]',
            },
          ],
        },
      ],
    }

    it('should allow empty answers for optional fields', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJob)
      mockJobRepository.applyJob.mockResolvedValue({
        id: 200,
        status: JobApplicationStatus.APPLIED,
      })

      const result = await service.applyJob(1, 2, { answers: [] })

      expect(result.success).toBe(true)
    })

    it('should validate select field options', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJob)

      await expect(
        service.applyJob(1, 2, {
          answers: [
            {
              fieldId: 101,
              value: 'Rust', // Invalid option
            },
          ],
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should accept valid select options', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJob)
      mockJobRepository.applyJob.mockResolvedValue({
        id: 200,
        status: JobApplicationStatus.APPLIED,
      })

      const result = await service.applyJob(1, 2, {
        answers: [
          {
            fieldId: 101,
            value: 'Java',
          },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('should trim whitespace from answers', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJob)
      mockJobRepository.applyJob.mockResolvedValue({
        id: 200,
        status: JobApplicationStatus.APPLIED,
      })

      await service.applyJob(1, 2, {
        answers: [
          {
            fieldId: 100,
            value: '  John Doe  ',
          },
        ],
      })

      expect(jobRepository.applyJob).toHaveBeenCalledWith({
        jobId: 1,
        userId: 2,
        answers: [
          {
            fieldId: 100,
            value: 'John Doe',
          },
        ],
      })
    })

    it('should reject duplicate field answers', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJob)

      await expect(
        service.applyJob(1, 2, {
          answers: [
            { fieldId: 100, value: 'First' },
            { fieldId: 100, value: 'Second' },
          ],
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject answers for non-existent fields', async () => {
      mockJobRepository.findJobWithApplyForm.mockResolvedValue(mockJob)

      await expect(
        service.applyJob(1, 2, {
          answers: [
            {
              fieldId: 999, // Non-existent field
              value: 'Invalid',
            },
          ],
        })
      ).rejects.toThrow(BadRequestException)
    })
  })
})
