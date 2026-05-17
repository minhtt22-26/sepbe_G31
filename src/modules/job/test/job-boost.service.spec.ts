import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { JobService } from '../service/job.service'
import { JobRepository } from '../repositories/job.repository'
import { SepayService } from '../service/sepay.service'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
import { WalletService } from 'src/modules/wallet/wallet.service'
import { InterviewInvitationService } from 'src/modules/interview-invitation/service/interview-invitation.service'
import { JobStatus, WalletTransactionType } from 'src/generated/prisma/enums'

describe('JobService - Boost Features (Point-Only Flow)', () => {
  let service: JobService
  let jobRepository: JobRepository
  let walletService: WalletService

  const mockJobRepository = {
    findJobById: jest.fn(),
    activateBoostByPoint: jest.fn(),
    publishJobByPoint: jest.fn(),
  }

  const mockSepayService = {
    buildBoostCheckout: jest.fn(),
    isValidWebhookAuthorization: jest.fn(),
    extractOrderIdFromPayload: jest.fn(),
  }

  const mockAIMatchingService = {
    buildJobEmbedding: jest.fn(),
  }

  const mockWalletService = {
    getBoostPackagesForEmployer: jest.fn(),
    resolveBoostPackage: jest.fn(),
    deductPoints: jest.fn(),
    getPointCost: jest.fn(),
  }

  const mockInterviewInvitationService = {}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: JobRepository,
          useValue: mockJobRepository,
        },
        {
          provide: SepayService,
          useValue: mockSepayService,
        },
        {
          provide: AIMatchingService,
          useValue: mockAIMatchingService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: InterviewInvitationService,
          useValue: mockInterviewInvitationService,
        },
      ],
    }).compile()

    service = module.get<JobService>(JobService)
    jobRepository = module.get<JobRepository>(JobRepository)
    walletService = module.get<WalletService>(WalletService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createBoostCheckout', () => {
    const mockJob = {
      id: 1,
      companyId: 5,
      status: JobStatus.PUBLISHED,
      company: { ownerId: 10 },
    }

    it('should throw when job not found', async () => {
      mockJobRepository.findJobById.mockResolvedValue(null)

      await expect(
        service.createBoostCheckout(1, 5, { packageDays: 7 })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw when job not published', async () => {
      mockJobRepository.findJobById.mockResolvedValue({
        ...mockJob,
        status: JobStatus.WARNING,
      })

      await expect(
        service.createBoostCheckout(1, 5, { packageDays: 7 })
      ).rejects.toThrow(BadRequestException)
    })

    it('should deduct points and activate boost on successful point-only checkout', async () => {
      const mockPackage = {
        id: 2,
        name: 'Gói 7 ngày',
        durationDays: 7,
        price: 50000,
      }
      const mockBoostedJobResult = {
        id: 1,
        isBoosted: true,
        boostExpiredAt: new Date('2026-06-01T00:00:00Z'),
      }

      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockWalletService.resolveBoostPackage.mockResolvedValue(mockPackage)
      mockWalletService.deductPoints.mockResolvedValue(undefined)
      mockJobRepository.activateBoostByPoint.mockResolvedValue(mockBoostedJobResult)

      const result = await service.createBoostCheckout(1, 5, {
        packageDays: 7,
      })

      expect(result.success).toBe(true)
      expect(result.data.jobId).toBe(1)
      expect(result.data.packageId).toBe(2)
      expect(result.data.packageName).toBe('Gói 7 ngày')
      expect(result.data.packageDays).toBe(7)
      expect(result.data.pointCost).toBe(50000)
      expect(result.data.boostExpiredAt).toEqual(mockBoostedJobResult.boostExpiredAt)

      expect(walletService.resolveBoostPackage).toHaveBeenCalledWith(7)
      expect(walletService.deductPoints).toHaveBeenCalledWith({
        companyId: 5,
        cost: 50000,
        type: WalletTransactionType.BOOST_JOB,
        referenceType: 'JOB',
        referenceId: 1,
        metadata: {
          packageId: 2,
          packageName: 'Gói 7 ngày',
          packageDays: 7,
        },
      })
      expect(jobRepository.activateBoostByPoint).toHaveBeenCalledWith({
        jobId: 1,
        durationDays: 7,
      })
    })
  })

  describe('confirmBoostPayment', () => {
    const mockJob = {
      id: 1,
      companyId: 5,
      isBoosted: false,
      boostExpiredAt: null,
    }

    it('should throw when job not found', async () => {
      mockJobRepository.findJobById.mockResolvedValue(null)

      await expect(
        service.confirmBoostPayment(1, 5, { paymentOrderId: 100 })
      ).rejects.toThrow(NotFoundException)
    })

    it('should return deprecated warning directly when job is found', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)

      const result = await service.confirmBoostPayment(1, 5, { paymentOrderId: 100 })

      expect(result.success).toBe(false)
      expect(result.message).toContain('Endpoint xác nhận payment boost đã ngưng')
    })
  })

  describe('handleSepayWebhook', () => {
    it('should return deprecated warning directly', async () => {
      const result = await service.handleSepayWebhook('some-header', {})

      expect(result.success).toBe(true)
      expect(result.message).toContain('Luồng webhook SePay cho job/boost đã ngưng')
    })
  })

  describe('getBoostPackages', () => {
    it('should return boost packages for employer', async () => {
      const mockPackages = [
        { id: 1, name: 'Gói 7 ngày', durationDays: 7, price: 50000, isDefault: true }
      ]
      mockWalletService.getBoostPackagesForEmployer.mockResolvedValue(mockPackages)

      const result = await service.getBoostPackages()

      expect(result.success).toBe(true)
      expect(result.items).toEqual(mockPackages)
      expect(walletService.getBoostPackagesForEmployer).toHaveBeenCalled()
    })
  })
})
