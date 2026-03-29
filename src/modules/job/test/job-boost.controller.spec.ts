import { Test, TestingModule } from '@nestjs/testing'
import { JobController } from '../controller/job.controller'
import { JobService } from '../service/job.service'
import { CompanyService } from 'src/modules/company/company.service'

describe('JobController - Boost Endpoints', () => {
  let controller: JobController
  let jobService: JobService
  let companyService: CompanyService

  const mockJobService = {
    createBoostCheckout: jest.fn(),
    confirmBoostPayment: jest.fn(),
    handleSepayWebhook: jest.fn(),
    getBoostedJobs: jest.fn(),
  }

  const mockCompanyService = {
    findByOwnerId: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: JobService,
          useValue: mockJobService,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    }).compile()

    controller = module.get<JobController>(JobController)
    jobService = module.get<JobService>(JobService)
    companyService = module.get<CompanyService>(CompanyService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /job/:id/boost/checkout', () => {
    it('should call createBoostCheckout with correct parameters', async () => {
      const mockUser = { userId: 10 }
      const mockCompany = { id: 5, ownerId: 10 }
      const mockCheckout = {
        success: true,
        data: { paymentOrderId: 100 },
      }

      mockCompanyService.findByOwnerId.mockResolvedValue(mockCompany)
      mockJobService.createBoostCheckout.mockResolvedValue(mockCheckout)

      const result = await controller.createBoostCheckout(
        mockUser,
        1,
        { packageDays: 7 }
      )

      expect(companyService.findByOwnerId).toHaveBeenCalledWith(10)
      expect(jobService.createBoostCheckout).toHaveBeenCalledWith(
        1,
        5,
        { packageDays: 7 }
      )
      expect(result).toEqual(mockCheckout)
    })

    it('should pass custom amount to service', async () => {
      const mockUser = { userId: 10 }
      const mockCompany = { id: 5, ownerId: 10 }
      const mockCheckout = { success: true }

      mockCompanyService.findByOwnerId.mockResolvedValue(mockCompany)
      mockJobService.createBoostCheckout.mockResolvedValue(mockCheckout)

      await controller.createBoostCheckout(mockUser, 1, {
        packageDays: 7,
        amount: 75000,
      })

      expect(jobService.createBoostCheckout).toHaveBeenCalledWith(
        1,
        5,
        expect.objectContaining({ amount: 75000 })
      )
    })
  })

  describe('POST /job/:id/boost/confirm', () => {
    it('should call confirmBoostPayment with correct parameters', async () => {
      const mockUser = { userId: 10 }
      const mockCompany = { id: 5, ownerId: 10 }
      const mockResult = { success: true }

      mockCompanyService.findByOwnerId.mockResolvedValue(mockCompany)
      mockJobService.confirmBoostPayment.mockResolvedValue(mockResult)

      const result = await controller.confirmBoostPayment(
        mockUser,
        1,
        { paymentOrderId: 100 }
      )

      expect(companyService.findByOwnerId).toHaveBeenCalledWith(10)
      expect(jobService.confirmBoostPayment).toHaveBeenCalledWith(
        1,
        5,
        { paymentOrderId: 100 }
      )
      expect(result).toEqual(mockResult)
    })

    it('should pass transactionCode to service', async () => {
      const mockUser = { userId: 10 }
      const mockCompany = { id: 5, ownerId: 10 }

      mockCompanyService.findByOwnerId.mockResolvedValue(mockCompany)
      mockJobService.confirmBoostPayment.mockResolvedValue({ success: true })

      await controller.confirmBoostPayment(mockUser, 1, {
        paymentOrderId: 100,
        transactionCode: 'TXN123',
      })

      expect(jobService.confirmBoostPayment).toHaveBeenCalledWith(
        1,
        5,
        expect.objectContaining({ transactionCode: 'TXN123' })
      )
    })
  })

  describe('POST /job/boost/sepay/webhook', () => {
    it('should call handleSepayWebhook with authorization and body', async () => {
      const mockWebhookResult = { success: true }

      mockJobService.handleSepayWebhook.mockResolvedValue(mockWebhookResult)

      const result = await controller.handleSepayWebhook(
        'apikey test-key',
        {
          transferType: 'in',
          transferAmount: 50000,
        }
      )

      expect(jobService.handleSepayWebhook).toHaveBeenCalledWith(
        'apikey test-key',
        {
          transferType: 'in',
          transferAmount: 50000,
        }
      )
      expect(result).toEqual(mockWebhookResult)
    })

    it('should handle missing authorization header', async () => {
      mockJobService.handleSepayWebhook.mockResolvedValue({ success: true })

      await controller.handleSepayWebhook(undefined, { transferType: 'in' })

      expect(jobService.handleSepayWebhook).toHaveBeenCalledWith(
        undefined,
        { transferType: 'in' }
      )
    })

    it('should handle missing body', async () => {
      mockJobService.handleSepayWebhook.mockResolvedValue({ success: true })

      await controller.handleSepayWebhook('apikey test-key', undefined)

      expect(jobService.handleSepayWebhook).toHaveBeenCalledWith(
        'apikey test-key',
        undefined
      )
    })
  })

  describe('GET /job/boosted', () => {
    it('should call getBoostedJobs with default pagination', async () => {
      const mockBoostedJobs = {
        success: true,
        items: [],
        meta: { page: 1, limit: 10, total: 0 },
      }

      mockJobService.getBoostedJobs.mockResolvedValue(mockBoostedJobs)

      const result = await controller.getBoostedJobs()

      expect(jobService.getBoostedJobs).toHaveBeenCalledWith(1, 10)
      expect(result).toEqual(mockBoostedJobs)
    })

    it('should call getBoostedJobs with custom pagination', async () => {
      const mockBoostedJobs = {
        success: true,
        items: [{ id: 1, title: 'Boosted Job' }],
        meta: { page: 2, limit: 20, total: 25 },
      }

      mockJobService.getBoostedJobs.mockResolvedValue(mockBoostedJobs)

      const result = await controller.getBoostedJobs(2, 20)

      expect(jobService.getBoostedJobs).toHaveBeenCalledWith(2, 20)
      expect(result).toEqual(mockBoostedJobs)
    })

    it('should handle string parameters', async () => {
      mockJobService.getBoostedJobs.mockResolvedValue({
        success: true,
      })

      await controller.getBoostedJobs('3', '15')

      expect(jobService.getBoostedJobs).toHaveBeenCalledWith(3, 15)
    })
  })
})
