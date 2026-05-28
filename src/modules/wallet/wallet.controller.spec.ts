import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { CompanyService } from '../company/company.service'
import { PaymentQueueService } from 'src/infrastructure/queue/payment/service/payment-queue.service'

const mockWalletService = {
  getCompanyWallet: jest.fn(),
  getPointPricing: jest.fn(),
  getWalletTransactions: jest.fn(),
  createTopupCheckout: jest.fn(),
  getTopupOrderStatus: jest.fn(),
  validateWebhookAuthorization: jest.fn(),
}

const mockCompanyService = {
  findByOwnerId: jest.fn(),
}

const mockPaymentQueueService = {
  queueTopupWebhook: jest.fn(),
}

const company = { id: 5, name: 'WorkLink' }
const user = { userId: 1 }

describe('WalletController', () => {
  let controller: WalletController

  beforeEach(async () => {
    jest.clearAllMocks()
    mockCompanyService.findByOwnerId.mockResolvedValue(company)

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: PaymentQueueService, useValue: mockPaymentQueueService },
      ],
    }).compile()

    controller = module.get<WalletController>(WalletController)
  })

  // ── getMyWallet ───────────────────────────────────────────────────────────

  describe('getMyWallet', () => {
    it('returns wallet for current employer', async () => {
      mockWalletService.getCompanyWallet.mockResolvedValue({ id: 1, balancePoint: 10000 })
      const result = await controller.getMyWallet(user)
      expect(mockCompanyService.findByOwnerId).toHaveBeenCalledWith(1)
      expect(mockWalletService.getCompanyWallet).toHaveBeenCalledWith(5)
      expect(result.success).toBe(true)
      expect(result.data.balancePoint).toBe(10000)
    })
  })

  // ── getPointPricing ───────────────────────────────────────────────────────

  describe('getPointPricing', () => {
    it('returns pricing data', async () => {
      mockWalletService.getPointPricing.mockResolvedValue({ JOB_POST_POINT_COST: 50000 })
      const result = await controller.getPointPricing()
      expect(result.success).toBe(true)
      expect(result.data.JOB_POST_POINT_COST).toBe(50000)
    })
  })

  // ── getTransactions ───────────────────────────────────────────────────────

  describe('getTransactions', () => {
    it('returns paginated transactions', async () => {
      mockWalletService.getWalletTransactions.mockResolvedValue({ wallet: {}, items: [], meta: {} })
      const result = await controller.getTransactions(user, '1', '20')
      expect(mockWalletService.getWalletTransactions).toHaveBeenCalledWith(5, 1, 20)
      expect(result.success).toBe(true)
    })

    it('defaults to page 1 limit 20 when params missing', async () => {
      mockWalletService.getWalletTransactions.mockResolvedValue({ wallet: {}, items: [], meta: {} })
      await controller.getTransactions(user)
      expect(mockWalletService.getWalletTransactions).toHaveBeenCalledWith(5, 1, 20)
    })
  })

  // ── createTopupCheckout ───────────────────────────────────────────────────

  describe('createTopupCheckout', () => {
    it('creates checkout and returns QR data', async () => {
      mockWalletService.createTopupCheckout.mockResolvedValue({ paymentUrl: 'https://qr.url' })
      const result = await controller.createTopupCheckout(user, { amount: 100000 })
      expect(result.success).toBe(true)
      expect(result.data.paymentUrl).toBe('https://qr.url')
    })

    it('throws BadRequestException when amount is zero', async () => {
      await expect(controller.createTopupCheckout(user, { amount: 0 })).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when amount is negative', async () => {
      await expect(controller.createTopupCheckout(user, { amount: -100 })).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when amount is NaN', async () => {
      await expect(controller.createTopupCheckout(user, { amount: NaN })).rejects.toThrow(BadRequestException)
    })
  })

  // ── getTopupOrderStatus ───────────────────────────────────────────────────

  describe('getTopupOrderStatus', () => {
    it('returns order status', async () => {
      mockWalletService.getTopupOrderStatus.mockResolvedValue({ orderId: 42, status: 'PENDING' })
      const result = await controller.getTopupOrderStatus(user, 42)
      expect(mockWalletService.getTopupOrderStatus).toHaveBeenCalledWith(42, 5, 1)
      expect(result.success).toBe(true)
    })
  })

  // ── handleTopupWebhook ────────────────────────────────────────────────────

  describe('handleTopupWebhook', () => {
    it('throws UnauthorizedException when auth invalid', async () => {
      mockWalletService.validateWebhookAuthorization.mockReturnValue(false)
      await expect(controller.handleTopupWebhook('bad-key', {})).rejects.toThrow(UnauthorizedException)
    })

    it('queues webhook job and returns success', async () => {
      mockWalletService.validateWebhookAuthorization.mockReturnValue(true)
      mockPaymentQueueService.queueTopupWebhook.mockResolvedValue(undefined)
      const result = await controller.handleTopupWebhook('apikey valid-key', { content: 'TOPUP42' })
      expect(mockPaymentQueueService.queueTopupWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: 'SEPAY' }),
      )
      expect(result.success).toBe(true)
    })

    it('uses empty object when body is undefined', async () => {
      mockWalletService.validateWebhookAuthorization.mockReturnValue(true)
      mockPaymentQueueService.queueTopupWebhook.mockResolvedValue(undefined)
      await controller.handleTopupWebhook('apikey key')
      expect(mockPaymentQueueService.queueTopupWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ payload: {} }),
      )
    })
  })
})
