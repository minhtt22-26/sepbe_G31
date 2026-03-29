import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { JobService } from '../service/job.service'
import { JobRepository } from '../repositories/job.repository'
import { SepayService } from '../service/sepay.service'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
import { JobStatus, PaymentMethod, PaymentStatus, OrderType } from 'src/generated/prisma/enums'

describe('JobService - Boost Features', () => {
  let service: JobService
  let jobRepository: JobRepository
  let sepayService: SepayService

  const mockJobRepository = {
    findJobById: jest.fn(),
    createBoostPaymentOrder: jest.fn(),
    findPaymentOrderById: jest.fn(),
    activateBoostAfterPayment: jest.fn(),
  }

  const mockSepayService = {
    buildBoostCheckout: jest.fn(),
    isValidWebhookAuthorization: jest.fn(),
    extractOrderIdFromPayload: jest.fn(),
  }

  const mockAIMatchingService = {
    buildJobEmbedding: jest.fn(),
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
          provide: SepayService,
          useValue: mockSepayService,
        },
        {
          provide: AIMatchingService,
          useValue: mockAIMatchingService,
        },
      ],
    }).compile()

    service = module.get<JobService>(JobService)
    jobRepository = module.get<JobRepository>(JobRepository)
    sepayService = module.get<SepayService>(SepayService)
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

    it('should throw for invalid package days', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)

      await expect(
        service.createBoostCheckout(1, 5, { packageDays: 14 })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw for non-SEPAY payment method', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)

      await expect(
        service.createBoostCheckout(1, 5, {
          packageDays: 7,
          paymentMethod: 'CREDIT_CARD',
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should create boost checkout with default amount', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.createBoostPaymentOrder.mockResolvedValue({
        id: 100,
        amount: 50000,
        status: PaymentStatus.PENDING,
      })
      mockSepayService.buildBoostCheckout.mockReturnValue({
        paymentCode: 'BOOST1',
        paymentUrl: 'https://vietqr.io/...',
        transferNote: 'BOOST1',
        bankCode: 'BIDV',
        accountNumber: '123456',
        accountName: 'Test Company',
      })

      const result = await service.createBoostCheckout(1, 5, {
        packageDays: 7,
      })

      expect(result.success).toBe(true)
      expect(result.data.paymentOrderId).toBe(100)
      expect(result.data.packageDays).toBe(7)
      expect(jobRepository.createBoostPaymentOrder).toHaveBeenCalledWith({
        userId: 10,
        jobId: 1,
        amount: 50000,
        paymentMethod: PaymentMethod.SEPAY,
      })
    })

    it('should create boost checkout with custom amount', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.createBoostPaymentOrder.mockResolvedValue({
        id: 101,
        amount: 75000,
      })
      mockSepayService.buildBoostCheckout.mockReturnValue({
        paymentCode: 'BOOST1',
        paymentUrl: 'https://vietqr.io/...',
        transferNote: 'BOOST1',
        bankCode: 'BIDV',
        accountNumber: '123456',
        accountName: 'Test Company',
      })

      await service.createBoostCheckout(1, 5, {
        packageDays: 7,
        amount: 75000,
      })

      expect(jobRepository.createBoostPaymentOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 75000,
        })
      )
    })

    it('should throw for invalid amount', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)

      await expect(
        service.createBoostCheckout(1, 5, {
          packageDays: 7,
          amount: -1000,
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should handle 30-day package', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.createBoostPaymentOrder.mockResolvedValue({
        id: 102,
        amount: 300000,
      })
      mockSepayService.buildBoostCheckout.mockReturnValue({
        paymentCode: 'BOOST2',
        paymentUrl: 'https://vietqr.io/...',
        transferNote: 'BOOST2',
        bankCode: 'BIDV',
        accountNumber: '123456',
        accountName: 'Test Company',
      })

      const result = await service.createBoostCheckout(1, 5, {
        packageDays: 30,
      })

      expect(result.data.packageDays).toBe(30)
      expect(jobRepository.createBoostPaymentOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 300000,
        })
      )
    })
  })

  describe('confirmBoostPayment', () => {
    const mockJob = {
      id: 1,
      companyId: 5,
      isBoosted: false,
      boostExpiredAt: null,
    }
    const mockOrder = {
      id: 100,
      status: PaymentStatus.PENDING,
      amount: 50000,
      targetId: 1,
    }

    it('should throw when job not found', async () => {
      mockJobRepository.findJobById.mockResolvedValue(null)

      await expect(
        service.confirmBoostPayment(1, 5, { paymentOrderId: 100 })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw when order not found', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.findPaymentOrderById.mockResolvedValue(null)

      await expect(
        service.confirmBoostPayment(1, 5, { paymentOrderId: 100 })
      ).rejects.toThrow(NotFoundException)
    })

    it('should return success when order already completed', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.findPaymentOrderById.mockResolvedValue({
        ...mockOrder,
        status: PaymentStatus.COMPLETED,
      })

      const result = await service.confirmBoostPayment(1, 5, {
        paymentOrderId: 100,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('đã được xác nhận trước đó')
    })

    it('should throw when order status is not PENDING', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.findPaymentOrderById.mockResolvedValue({
        ...mockOrder,
        status: PaymentStatus.FAILED,
      })

      await expect(
        service.confirmBoostPayment(1, 5, { paymentOrderId: 100 })
      ).rejects.toThrow(BadRequestException)
    })

    it('should activate boost for 7 days with amount 50000', async () => {
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.findPaymentOrderById.mockResolvedValue(mockOrder)
      mockJobRepository.activateBoostAfterPayment.mockResolvedValue({
        order: { id: 100 },
        job: { id: 1, isBoosted: true, boostExpiredAt: '2026-04-05' },
      })

      const result = await service.confirmBoostPayment(1, 5, {
        paymentOrderId: 100,
        transactionCode: 'TXN123',
      })

      expect(result.success).toBe(true)
      expect(jobRepository.activateBoostAfterPayment).toHaveBeenCalledWith({
        orderId: 100,
        jobId: 1,
        durationDays: 7,
        transactionCode: 'TXN123',
      })
    })

    it('should activate boost for 30 days with amount 300000', async () => {
      const largeOrder = {
        ...mockOrder,
        amount: 300000,
      }
      mockJobRepository.findJobById.mockResolvedValue(mockJob)
      mockJobRepository.findPaymentOrderById.mockResolvedValue(largeOrder)
      mockJobRepository.activateBoostAfterPayment.mockResolvedValue({
        order: { id: 100 },
        job: { id: 1, isBoosted: true, boostExpiredAt: '2026-04-28' },
      })

      await service.confirmBoostPayment(1, 5, { paymentOrderId: 100 })

      expect(jobRepository.activateBoostAfterPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          durationDays: 30,
        })
      )
    })
  })

  describe('handleSepayWebhook', () => {
    const mockOrder = {
      id: 100,
      status: PaymentStatus.PENDING,
      amount: 50000,
      orderType: OrderType.BOOST_JOB,
      paymentMethod: PaymentMethod.SEPAY,
      targetId: 1,
    }

    it('should throw on invalid webhook authorization', async () => {
      sepayService.isValidWebhookAuthorization = jest
        .fn()
        .mockReturnValue(false)

      await expect(
        service.handleSepayWebhook('invalid-key', {})
      ).rejects.toThrow()
    })

    it('should throw on invalid payload', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)

      await expect(
        service.handleSepayWebhook('valid-key', null)
      ).rejects.toThrow()
    })

    it('should ignore outgoing transfer', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)

      const result = await service.handleSepayWebhook('valid-key', {
        transferType: 'out',
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Bỏ qua')
    })

    it('should ignore transfer without order code', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)
      mockSepayService.extractOrderIdFromPayload.mockReturnValue(null)

      const result = await service.handleSepayWebhook('valid-key', {
        transferType: 'in',
      })

      expect(result.success).toBe(true)
    })

    it('should ignore transfer for non-boost order', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)
      mockSepayService.extractOrderIdFromPayload.mockReturnValue(100)
      mockJobRepository.findPaymentOrderById.mockResolvedValue({
        ...mockOrder,
        orderType: 'OTHER_TYPE',
      })

      const result = await service.handleSepayWebhook('valid-key', {
        transferType: 'in',
      })

      expect(result.success).toBe(true)
    })

    it('should return error when amount insufficient', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)
      mockSepayService.extractOrderIdFromPayload.mockReturnValue(100)
      mockJobRepository.findPaymentOrderById.mockResolvedValue(mockOrder)

      const result = await service.handleSepayWebhook('valid-key', {
        transferType: 'in',
        transferAmount: 30000,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('chưa đủ')
    })

    it('should activate boost on valid webhook', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)
      mockSepayService.extractOrderIdFromPayload.mockReturnValue(100)
      mockJobRepository.findPaymentOrderById.mockResolvedValue(mockOrder)
      mockJobRepository.activateBoostAfterPayment.mockResolvedValue({
        order: { id: 100 },
        job: { id: 1, isBoosted: true, boostExpiredAt: '2026-04-05' },
      })

      const result = await service.handleSepayWebhook('valid-key', {
        transferType: 'in',
        transferAmount: 50000,
        transactionCode: 'TXN456',
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('xác nhận')
      expect(jobRepository.activateBoostAfterPayment).toHaveBeenCalled()
    })

    it('should use fallback transaction code', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)
      mockSepayService.extractOrderIdFromPayload.mockReturnValue(100)
      mockJobRepository.findPaymentOrderById.mockResolvedValue(mockOrder)
      mockJobRepository.activateBoostAfterPayment.mockResolvedValue({
        order: { id: 100 },
        job: { id: 1 },
      })

      await service.handleSepayWebhook('valid-key', {
        transferType: 'in',
        transferAmount: 50000,
        id: 'webhook-123',
      })

      expect(jobRepository.activateBoostAfterPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionCode: expect.any(String),
        })
      )
    })

    it('should ignore when order already completed', async () => {
      mockSepayService.isValidWebhookAuthorization.mockReturnValue(true)
      mockSepayService.extractOrderIdFromPayload.mockReturnValue(100)
      mockJobRepository.findPaymentOrderById.mockResolvedValue({
        ...mockOrder,
        status: PaymentStatus.COMPLETED,
      })

      const result = await service.handleSepayWebhook('valid-key', {
        transferType: 'in',
        transferAmount: 50000,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('đã xử lý')
    })
  })
})
