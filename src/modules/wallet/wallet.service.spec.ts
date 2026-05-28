import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { PrismaService } from 'src/prisma.service'
import paymentConfig from 'src/config/payment.config'
import { OrderType, PaymentMethod, PaymentStatus, WalletTransactionType } from 'src/generated/prisma/enums'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CFG = {
  sepayBankCode: 'VCB',
  sepayAccountNumber: '9999888877776666',
  sepayAccountName: 'WORKLINK TEST',
  sepayWebhookApiKey: 'secret-key-123',
  sepayOrderPrefix: 'TOPUP',
}

const mockWallet = { id: 10, companyId: 1, balancePoint: 100000, totalTopupPoint: 0, totalSpentPoint: 0 }
const mockOrder = {
  id: 42,
  userId: 5,
  targetId: 1,
  orderType: OrderType.TOPUP_WALLET,
  status: PaymentStatus.PENDING,
  amount: 50000,
  pointAmount: 50000,
  paymentMethod: PaymentMethod.SEPAY,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockTx = {
  companyWallet: { upsert: jest.fn(), update: jest.fn() },
  paymentOrder: { update: jest.fn() },
  walletTransaction: { create: jest.fn() },
  notification: { create: jest.fn() },
}

const mockPrisma = {
  companyWallet: { upsert: jest.fn(), update: jest.fn() },
  paymentOrder: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  systemSetting: { findUnique: jest.fn(), findMany: jest.fn() },
  paymentPackage: { findMany: jest.fn() },
  walletTransaction: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  notification: { create: jest.fn() },
  $transaction: jest.fn(),
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('WalletService', () => {
  let service: WalletService

  beforeEach(async () => {
    jest.clearAllMocks()

    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return Promise.all(arg)
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: paymentConfig.KEY, useValue: CFG },
      ],
    }).compile()

    service = module.get<WalletService>(WalletService)
  })

  // ── validateWebhookAuthorization ──────────────────────────────────────────

  describe('validateWebhookAuthorization', () => {
    it('returns true when no api key configured', () => {
      const svc = buildServiceWithConfig({ ...CFG, sepayWebhookApiKey: '' })
      expect(svc.validateWebhookAuthorization()).toBe(true)
    })

    it('returns false when header is missing', () => {
      expect(service.validateWebhookAuthorization(undefined)).toBe(false)
    })

    it('returns false when header is empty string', () => {
      expect(service.validateWebhookAuthorization('')).toBe(false)
    })

    it('returns true with "apikey <key>" format', () => {
      expect(service.validateWebhookAuthorization('apikey secret-key-123')).toBe(true)
    })

    it('returns true with bare key format', () => {
      expect(service.validateWebhookAuthorization('secret-key-123')).toBe(true)
    })

    it('returns true case-insensitively', () => {
      expect(service.validateWebhookAuthorization('APIKEY SECRET-KEY-123')).toBe(true)
    })

    it('returns false with wrong key', () => {
      expect(service.validateWebhookAuthorization('apikey wrong-key')).toBe(false)
    })
  })

  // ── getPointCost ──────────────────────────────────────────────────────────

  describe('getPointCost', () => {
    it('returns parsed value from DB', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: '75000' })
      expect(await service.getPointCost('JOB_POST_POINT_COST', 50000)).toBe(75000)
    })

    it('returns fallback when setting not found', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null)
      expect(await service.getPointCost('JOB_POST_POINT_COST', 50000)).toBe(50000)
    })

    it('returns fallback when value is not a valid number', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: 'abc' })
      expect(await service.getPointCost('JOB_POST_POINT_COST', 50000)).toBe(50000)
    })

    it('floors decimal values', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: '99.9' })
      expect(await service.getPointCost('ANY', 0)).toBe(99)
    })
  })

  // ── getPointPricing ───────────────────────────────────────────────────────

  describe('getPointPricing', () => {
    it('returns defaults when no settings in DB', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([])
      const result = await service.getPointPricing()
      expect(result).toEqual({
        JOB_POST_POINT_COST: 50000,
        BOOST_JOB_POINT_COST: 50000,
        BOOST_JOB_DURATION_DAYS: 7,
        AI_INVITE_POINT_COST_PER_WORKER: 1000,
      })
    })

    it('returns DB values when present', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: 'JOB_POST_POINT_COST', value: '30000' },
        { key: 'BOOST_JOB_DURATION_DAYS', value: '14' },
      ])
      const result = await service.getPointPricing()
      expect(result.JOB_POST_POINT_COST).toBe(30000)
      expect(result.BOOST_JOB_DURATION_DAYS).toBe(14)
      expect(result.BOOST_JOB_POINT_COST).toBe(50000) // fallback
    })
  })

  // ── ensureCompanyWallet ───────────────────────────────────────────────────

  describe('ensureCompanyWallet', () => {
    it('upserts and returns wallet', async () => {
      mockPrisma.companyWallet.upsert.mockResolvedValue(mockWallet)
      const result = await service.ensureCompanyWallet(1)
      expect(mockPrisma.companyWallet.upsert).toHaveBeenCalledWith({
        where: { companyId: 1 },
        update: {},
        create: { companyId: 1 },
      })
      expect(result).toBe(mockWallet)
    })
  })

  // ── getBoostPackagesForEmployer ───────────────────────────────────────────

  describe('getBoostPackagesForEmployer', () => {
    beforeEach(() => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null) // uses fallbacks
    })

    it('returns packages from DB when available', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([
        { id: 1, name: 'Goi 7 ngay', description: null, durationDays: 7, price: 50000, isDefault: true },
        { id: 2, name: 'Goi 30 ngay', description: null, durationDays: 30, price: 150000, isDefault: false },
      ])
      const result = await service.getBoostPackagesForEmployer()
      expect(result).toHaveLength(2)
      expect(result[0].durationDays).toBe(7)
    })

    it('injects fallback package when duration not covered', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([
        { id: 1, name: 'Goi 30 ngay', description: null, durationDays: 30, price: 150000, isDefault: true },
      ])
      const result = await service.getBoostPackagesForEmployer()
      // Fallback 7-day package should be added
      const fallback = result.find((p) => p.durationDays === 7)
      expect(fallback).toBeDefined()
      expect(fallback?.id).toBe(0)
    })

    it('returns single fallback package when DB is empty', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([])
      const result = await service.getBoostPackagesForEmployer()
      expect(result).toHaveLength(1)
      expect(result[0].isDefault).toBe(true)
    })
  })

  // ── resolveBoostPackage ───────────────────────────────────────────────────

  describe('resolveBoostPackage', () => {
    const packages = [
      { id: 1, name: 'Goi 7 ngay', description: null, durationDays: 7, price: 50000, isDefault: true },
      { id: 2, name: 'Goi 30 ngay', description: null, durationDays: 30, price: 150000, isDefault: false },
    ]

    beforeEach(() => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue(packages)
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null)
    })

    it('returns package matching requested duration', async () => {
      const result = await service.resolveBoostPackage(30)
      expect(result.durationDays).toBe(30)
    })

    it('returns default package when no duration specified', async () => {
      const result = await service.resolveBoostPackage()
      expect(result.isDefault).toBe(true)
    })

    it('throws BadRequestException for unknown duration', async () => {
      await expect(service.resolveBoostPackage(99)).rejects.toThrow(BadRequestException)
    })
  })

  // ── createTopupCheckout ───────────────────────────────────────────────────

  describe('createTopupCheckout', () => {
    beforeEach(() => {
      mockPrisma.companyWallet.upsert.mockResolvedValue(mockWallet)
      mockPrisma.paymentOrder.create.mockResolvedValue(mockOrder)
    })

    it('creates order and returns QR URL', async () => {
      const result = await service.createTopupCheckout(1, 50000, 5)
      expect(mockPrisma.paymentOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderType: OrderType.TOPUP_WALLET,
            paymentMethod: PaymentMethod.SEPAY,
            status: PaymentStatus.PENDING,
          }),
        }),
      )
      expect(result.paymentUrl).toContain('vietqr.io')
      expect(result.paymentCode).toContain('TOPUP')
    })

    it('throws BadRequestException for zero amount', async () => {
      await expect(service.createTopupCheckout(1, 0, 5)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for negative amount', async () => {
      await expect(service.createTopupCheckout(1, -1000, 5)).rejects.toThrow(BadRequestException)
    })

    it('throws error when SePay not configured', async () => {
      const svc = buildServiceWithConfig({ ...CFG, sepayBankCode: '', sepayAccountNumber: '' })
      await expect(svc.createTopupCheckout(1, 50000, 5)).rejects.toThrow()
    })
  })

  // ── getTopupOrderStatus ───────────────────────────────────────────────────

  describe('getTopupOrderStatus', () => {
    beforeEach(() => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.companyWallet.upsert.mockResolvedValue(mockWallet)
    })

    it('returns order status and wallet balance', async () => {
      const result = await service.getTopupOrderStatus(42, 1, 5)
      expect(result.orderId).toBe(42)
      expect(result.status).toBe(PaymentStatus.PENDING)
      expect(result.walletBalancePoint).toBe(100000)
    })

    it('throws BadRequestException when order not found', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(null)
      await expect(service.getTopupOrderStatus(99, 1, 5)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when order is not TOPUP_WALLET type', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({ ...mockOrder, orderType: OrderType.BOOST_JOB })
      await expect(service.getTopupOrderStatus(42, 1, 5)).rejects.toThrow(BadRequestException)
    })

    it('throws UnauthorizedException when userId does not match', async () => {
      await expect(service.getTopupOrderStatus(42, 1, 999)).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when companyId does not match', async () => {
      await expect(service.getTopupOrderStatus(42, 999, 5)).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── processTopupWebhookPayload ────────────────────────────────────────────

  describe('processTopupWebhookPayload', () => {
    beforeEach(() => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(mockOrder)
      mockTx.companyWallet.upsert.mockResolvedValue(mockWallet)
      mockTx.companyWallet.update.mockResolvedValue({})
      mockTx.paymentOrder.update.mockResolvedValue({})
      mockTx.walletTransaction.create.mockResolvedValue({})
      mockTx.notification.create.mockResolvedValue({})
    })

    it('throws BadRequestException for null payload', async () => {
      await expect(service.processTopupWebhookPayload(null as any)).rejects.toThrow(BadRequestException)
    })

    it('ignores outbound transfer (transferType not starting with "in")', async () => {
      const result = await service.processTopupWebhookPayload({ transferType: 'out', content: 'TOPUP42' })
      expect(result.success).toBe(true)
      expect(result.message).toContain('Bỏ qua')
    })

    it('ignores payload without valid order code', async () => {
      const result = await service.processTopupWebhookPayload({ content: 'some random text' })
      expect(result.success).toBe(true)
      expect(result.message).toContain('Bỏ qua')
    })

    it('ignores already completed order (idempotency)', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({ ...mockOrder, status: PaymentStatus.COMPLETED })
      const result = await service.processTopupWebhookPayload({ content: 'TOPUP42', transferAmount: 50000 })
      expect(result.success).toBe(true)
      expect(result.message).toContain('đã xử lý')
    })

    it('ignores when transfer amount is insufficient', async () => {
      const result = await service.processTopupWebhookPayload({ content: 'TOPUP42', transferAmount: 1000 })
      expect(result.success).toBe(true)
      expect(result.message).toContain('chưa đủ')
    })

    it('processes valid webhook and credits wallet', async () => {
      const result = await service.processTopupWebhookPayload({
        content: 'TOPUP42',
        transferAmount: 50000,
        referenceCode: 'TX-ABC123',
      })
      expect(result.success).toBe(true)
      expect(result.message).toContain('thành công')
      expect(result.data?.paymentOrderId).toBe(42)
      expect(result.data?.pointAmount).toBe(50000)
    })

    it('handles nested payload under "data" key', async () => {
      const result = await service.processTopupWebhookPayload({
        data: { content: 'TOPUP42', transferAmount: 50000 },
      })
      expect(result.success).toBe(true)
      expect(result.message).toContain('thành công')
    })

    it('returns error when order has no companyId (targetId null)', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({ ...mockOrder, targetId: null })
      await expect(
        service.processTopupWebhookPayload({ content: 'TOPUP42', transferAmount: 50000 }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── processTopupWebhook ───────────────────────────────────────────────────

  describe('processTopupWebhook', () => {
    beforeEach(() => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(mockOrder)
      mockTx.companyWallet.upsert.mockResolvedValue(mockWallet)
      mockTx.companyWallet.update.mockResolvedValue({})
      mockTx.paymentOrder.update.mockResolvedValue({})
      mockTx.walletTransaction.create.mockResolvedValue({})
      mockTx.notification.create.mockResolvedValue({})
    })

    it('throws UnauthorizedException with invalid auth header', async () => {
      await expect(service.processTopupWebhook('apikey wrong-key', { content: 'TOPUP42' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('processes webhook with valid auth', async () => {
      const result = await service.processTopupWebhook('apikey secret-key-123', {
        content: 'TOPUP42',
        transferAmount: 50000,
      })
      expect(result.success).toBe(true)
    })
  })

  // ── deductPoints ─────────────────────────────────────────────────────────

  describe('deductPoints', () => {
    const baseParams = {
      companyId: 1,
      cost: 50000,
      type: WalletTransactionType.POST_JOB,
      referenceType: 'JOB',
      referenceId: 7,
    }

    beforeEach(() => {
      mockTx.companyWallet.upsert.mockResolvedValue(mockWallet) // balancePoint: 100000
      mockTx.companyWallet.update.mockResolvedValue({})
      mockTx.walletTransaction.create.mockResolvedValue({})
    })

    it('deducts points when balance is sufficient', async () => {
      await service.deductPoints(baseParams)
      expect(mockTx.companyWallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balancePoint: 50000 }),
        }),
      )
    })

    it('throws BadRequestException when balance is insufficient', async () => {
      mockTx.companyWallet.upsert.mockResolvedValue({ ...mockWallet, balancePoint: 10000 })
      await expect(service.deductPoints(baseParams)).rejects.toThrow(BadRequestException)
    })

    it('skips deduction when cost is zero', async () => {
      await service.deductPoints({ ...baseParams, cost: 0 })
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('creates WalletTransaction with negative pointDelta', async () => {
      await service.deductPoints(baseParams)
      expect(mockTx.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pointDelta: -50000 }),
        }),
      )
    })
  })

  // ── getWalletTransactions ─────────────────────────────────────────────────

  describe('getWalletTransactions', () => {
    const mockTxItems = [{ id: 1 }, { id: 2 }]

    beforeEach(() => {
      mockPrisma.companyWallet.upsert.mockResolvedValue(mockWallet)
      mockPrisma.walletTransaction.findMany.mockResolvedValue(mockTxItems)
      mockPrisma.walletTransaction.count.mockResolvedValue(2)
      mockPrisma.$transaction.mockResolvedValue([mockTxItems, 2])
    })

    it('returns paginated transactions with meta', async () => {
      const result = await service.getWalletTransactions(1, 1, 10)
      expect(result.wallet).toBe(mockWallet)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.total).toBe(2)
      expect(result.meta.totalPage).toBe(1)
    })

    it('defaults page to 1 when invalid', async () => {
      const result = await service.getWalletTransactions(1, 0, 10)
      expect(result.meta.page).toBe(1)
    })

    it('clamps limit to 100 max', async () => {
      const result = await service.getWalletTransactions(1, 1, 999)
      expect(result.meta.limit).toBe(100)
    })
  })
})

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildServiceWithConfig(cfg: typeof CFG): WalletService {
  return new WalletService(mockPrisma as any, cfg as any)
}
