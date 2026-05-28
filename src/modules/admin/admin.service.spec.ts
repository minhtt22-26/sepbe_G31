import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AdminService } from './admin.service'
import { PrismaService } from 'src/prisma.service'
import { OrderType } from 'src/generated/prisma/enums'

// ─── TX mock ─────────────────────────────────────────────────────────────────
const mockTx = {
  paymentPackage: {
    updateMany: jest.fn().mockResolvedValue({}),
    create: jest.fn(),
    update: jest.fn(),
  },
  systemSetting: { upsert: jest.fn().mockResolvedValue({}) },
}

// ─── Prisma mock ─────────────────────────────────────────────────────────────
const mockPrisma = {
  user: { count: jest.fn() },
  company: { count: jest.fn() },
  job: { count: jest.fn(), groupBy: jest.fn() },
  jobApplication: { count: jest.fn() },
  jobReport: { count: jest.fn() },
  paymentOrder: { aggregate: jest.fn(), groupBy: jest.fn() },
  walletTransaction: { groupBy: jest.fn() },
  occupation: { findMany: jest.fn() },
  paymentPackage: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  systemSetting: { findMany: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
}

describe('AdminService', () => {
  let service: AdminService

  beforeEach(async () => {
    jest.clearAllMocks()

    // Default return values
    mockPrisma.user.count.mockResolvedValue(10)
    mockPrisma.company.count.mockResolvedValue(5)
    mockPrisma.job.count.mockResolvedValue(20)
    mockPrisma.jobApplication.count.mockResolvedValue(50)
    mockPrisma.jobReport.count.mockResolvedValue(2)
    mockPrisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amount: 500000 } })
    mockPrisma.paymentOrder.groupBy.mockResolvedValue([])
    mockPrisma.walletTransaction.groupBy.mockResolvedValue([])
    mockPrisma.job.groupBy.mockResolvedValue([])
    mockPrisma.occupation.findMany.mockResolvedValue([])

    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return Promise.all(arg)
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
  })

  // ── getPaymentPackages ────────────────────────────────────────────────────

  describe('getPaymentPackages', () => {
    it('returns all active packages by default', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([{ id: 1 }])
      const result = await service.getPaymentPackages({})
      expect(result.items).toHaveLength(1)
      expect(mockPrisma.paymentPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      )
    })

    it('filters by orderType when provided', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([])
      await service.getPaymentPackages({ orderType: OrderType.BOOST_JOB })
      expect(mockPrisma.paymentPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ orderType: OrderType.BOOST_JOB }) }),
      )
    })

    it('includes inactive packages when includeInactive=true', async () => {
      mockPrisma.paymentPackage.findMany.mockResolvedValue([])
      await service.getPaymentPackages({ includeInactive: true })
      const call = mockPrisma.paymentPackage.findMany.mock.calls[0][0]
      expect(call.where).not.toHaveProperty('isActive')
    })
  })

  // ── getPointPricingSettings ───────────────────────────────────────────────

  describe('getPointPricingSettings', () => {
    it('returns all 4 setting keys with defaults when DB empty', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([])
      const result = await service.getPointPricingSettings()
      expect(result.items).toHaveLength(4)
      expect(result.items.every((i) => i.value === 0)).toBe(true)
    })

    it('maps DB values into the result', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: 'JOB_POST_POINT_COST', value: '30000', description: 'Cost to post job' },
      ])
      const result = await service.getPointPricingSettings()
      const item = result.items.find((i) => i.key === 'JOB_POST_POINT_COST')
      expect(item?.value).toBe(30000)
      expect(item?.description).toBe('Cost to post job')
    })
  })

  // ── updatePointPricingSettings ────────────────────────────────────────────

  describe('updatePointPricingSettings', () => {
    beforeEach(() => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([])
      mockTx.systemSetting.upsert.mockResolvedValue({})
    })

    it('updates all settings successfully', async () => {
      await service.updatePointPricingSettings({
        JOB_POST_POINT_COST: 40000,
        BOOST_JOB_POINT_COST: 60000,
        BOOST_JOB_DURATION_DAYS: 7,
        AI_INVITE_POINT_COST_PER_WORKER: 2000,
      })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('throws BadRequestException for negative value', async () => {
      await expect(
        service.updatePointPricingSettings({ JOB_POST_POINT_COST: -1000 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when BOOST_JOB_DURATION_DAYS < 1', async () => {
      await expect(
        service.updatePointPricingSettings({ BOOST_JOB_DURATION_DAYS: 0 }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── createPaymentPackage ──────────────────────────────────────────────────

  describe('createPaymentPackage', () => {
    const baseDto = {
      name: 'Goi 7 ngay',
      orderType: OrderType.BOOST_JOB,
      durationDays: 7,
      price: 50000,
      isActive: true,
      isDefault: false,
    }

    beforeEach(() => {
      mockPrisma.paymentPackage.findFirst.mockResolvedValue(null) // no duplicate
      mockTx.paymentPackage.create.mockResolvedValue({ id: 1, ...baseDto })
    })

    it('creates a BOOST_JOB package successfully', async () => {
      const result = await service.createPaymentPackage(baseDto)
      expect(result.message).toContain('thanh cong')
      expect(mockTx.paymentPackage.create).toHaveBeenCalled()
    })

    it('throws BadRequestException when BOOST_JOB has no durationDays', async () => {
      await expect(
        service.createPaymentPackage({ ...baseDto, durationDays: undefined }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException on duplicate boost duration', async () => {
      mockPrisma.paymentPackage.findFirst.mockResolvedValue({ id: 99 })
      await expect(service.createPaymentPackage(baseDto)).rejects.toThrow(BadRequestException)
    })

    it('unsets other defaults when isDefault=true', async () => {
      await service.createPaymentPackage({ ...baseDto, isDefault: true })
      expect(mockTx.paymentPackage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: false } }),
      )
    })

    it('creates non-BOOST_JOB package without durationDays', async () => {
      mockTx.paymentPackage.create.mockResolvedValue({ id: 2 })
      await service.createPaymentPackage({
        name: 'Goi premium',
        orderType: OrderType.PREMIUM_SUBSCRIPTION,
        price: 100000,
        isActive: true,
        isDefault: false,
      })
      expect(mockTx.paymentPackage.create).toHaveBeenCalled()
    })
  })

  // ── updatePaymentPackage ──────────────────────────────────────────────────

  describe('updatePaymentPackage', () => {
    const existing = {
      id: 1,
      orderType: OrderType.BOOST_JOB,
      durationDays: 7,
      name: 'Old name',
    }

    beforeEach(() => {
      mockPrisma.paymentPackage.findUnique.mockResolvedValue(existing)
      mockPrisma.paymentPackage.findFirst.mockResolvedValue(null)
      mockTx.paymentPackage.update.mockResolvedValue({ id: 1, name: 'New name' })
    })

    it('updates an existing package', async () => {
      const result = await service.updatePaymentPackage(1, { name: 'New name', price: 60000 })
      expect(result.message).toContain('thanh cong')
    })

    it('throws NotFoundException when package does not exist', async () => {
      mockPrisma.paymentPackage.findUnique.mockResolvedValue(null)
      await expect(service.updatePaymentPackage(999, { name: 'X' })).rejects.toThrow(NotFoundException)
    })

    it('throws when updating BOOST_JOB to remove durationDays', async () => {
      await expect(
        service.updatePaymentPackage(1, { durationDays: null }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── getStatistics ─────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns statistics with correct shape', async () => {
      const result = await service.getStatistics(2025)
      expect(result).toHaveProperty('users')
      expect(result).toHaveProperty('companies')
      expect(result).toHaveProperty('jobs')
      expect(result).toHaveProperty('payments')
      expect(result).toHaveProperty('charts')
      expect(result.charts.labels).toHaveLength(12)
      expect(result.charts.revenue).toHaveLength(12)
    })

    it('uses current year when no year provided', async () => {
      const result = await service.getStatistics()
      expect(result.charts.labels[0]).toBe('Tháng 1')
    })

    it('aggregates revenue by order type', async () => {
      mockPrisma.paymentOrder.groupBy.mockResolvedValue([
        { orderType: OrderType.TOPUP_WALLET, _sum: { amount: 200000 } },
        { orderType: OrderType.BOOST_JOB, _sum: { amount: 100000 } },
      ])
      const result = await service.getStatistics(2025)
      expect(result.payments.revenueByType['TOPUP_WALLET']).toBe(200000)
      expect(result.payments.revenueByType['BOOST_JOB']).toBe(100000)
    })

    it('maps top occupations correctly', async () => {
      mockPrisma.job.groupBy.mockResolvedValue([{ occupationId: 3, _count: { id: 15 } }])
      mockPrisma.occupation.findMany.mockResolvedValue([{ id: 3, name: 'May mac' }])
      const result = await service.getStatistics(2025)
      expect(result.topOccupations[0].name).toBe('May mac')
      expect(result.topOccupations[0].jobCount).toBe(15)
    })

    it('handles missing occupation name gracefully', async () => {
      mockPrisma.job.groupBy.mockResolvedValue([{ occupationId: 99, _count: { id: 5 } }])
      mockPrisma.occupation.findMany.mockResolvedValue([])
      const result = await service.getStatistics(2025)
      expect(result.topOccupations[0].name).toContain('99')
    })
  })
})
