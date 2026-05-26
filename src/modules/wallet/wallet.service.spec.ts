import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { PrismaService } from 'src/prisma.service'
import paymentConfig from 'src/config/payment.config'
import { OrderType, PaymentMethod, PaymentStatus, WalletTransactionType } from 'src/generated/prisma/enums'

jest.mock('src/prisma.service', () => ({ PrismaService: class {} }))

const prismaMock = {
    companyWallet: {
        upsert: jest.fn(),
        update: jest.fn(),
    },
    systemSetting: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    paymentPackage: {
        findMany: jest.fn(),
    },
    paymentOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    walletTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
    },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
}

const paymentCfgMock = {
    sepayWebhookApiKey: 'test-api-key',
    sepayBankCode: 'VCB',
    sepayAccountNumber: '1234567890',
    sepayAccountName: 'Test Account',
    sepayOrderPrefix: 'BOOST',
}

describe('WalletService', () => {
    let service: WalletService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WalletService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: paymentConfig.KEY, useValue: paymentCfgMock },
            ],
        }).compile()

        service = module.get<WalletService>(WalletService)
    })

    afterEach(() => jest.clearAllMocks())

    describe('validateWebhookAuthorization', () => {
        it('[N] should return true for correct apikey header', () => {
            expect(service.validateWebhookAuthorization('apikey test-api-key')).toBe(true)
        })

        it('[N] should return true when key matches without prefix', () => {
            expect(service.validateWebhookAuthorization('test-api-key')).toBe(true)
        })

        it('[N] should return true when no webhook key configured', () => {
            const svc = new (WalletService as any)(prismaMock, {
                ...paymentCfgMock,
                sepayWebhookApiKey: '',
            })
            expect(svc.validateWebhookAuthorization(undefined)).toBe(true)
        })

        it('[A] should return false when header is missing', () => {
            expect(service.validateWebhookAuthorization(undefined)).toBe(false)
        })

        it('[A] should return false for wrong key', () => {
            expect(service.validateWebhookAuthorization('apikey wrong-key')).toBe(false)
        })

        it('[B] should be case-insensitive', () => {
            expect(service.validateWebhookAuthorization('APIKEY TEST-API-KEY')).toBe(true)
        })
    })

    describe('getPointCost', () => {
        it('[N] should return parsed value from DB', async () => {
            prismaMock.systemSetting.findUnique.mockResolvedValue({ value: '75000' })
            const result = await service.getPointCost('JOB_POST_POINT_COST', 50000)
            expect(result).toBe(75000)
        })

        it('[B] should return fallback when setting is null', async () => {
            prismaMock.systemSetting.findUnique.mockResolvedValue(null)
            const result = await service.getPointCost('MISSING_KEY', 50000)
            expect(result).toBe(50000)
        })

        it('[B] should return fallback for non-numeric value', async () => {
            prismaMock.systemSetting.findUnique.mockResolvedValue({ value: 'not-a-number' })
            const result = await service.getPointCost('BAD_KEY', 999)
            expect(result).toBe(999)
        })

        it('[B] should return fallback for negative value', async () => {
            prismaMock.systemSetting.findUnique.mockResolvedValue({ value: '-100' })
            const result = await service.getPointCost('NEG_KEY', 500)
            expect(result).toBe(500)
        })

        it('[B] should floor decimal values', async () => {
            prismaMock.systemSetting.findUnique.mockResolvedValue({ value: '9999.9' })
            const result = await service.getPointCost('DEC_KEY', 100)
            expect(result).toBe(9999)
        })
    })

    describe('getPointPricing', () => {
        it('[N] should return all pricing keys with DB values', async () => {
            prismaMock.systemSetting.findMany.mockResolvedValue([
                { key: 'JOB_POST_POINT_COST', value: '40000' },
                { key: 'BOOST_JOB_POINT_COST', value: '30000' },
                { key: 'BOOST_JOB_DURATION_DAYS', value: '14' },
                { key: 'AI_INVITE_POINT_COST_PER_WORKER', value: '2000' },
            ])

            const result = await service.getPointPricing()

            expect(result.JOB_POST_POINT_COST).toBe(40000)
            expect(result.BOOST_JOB_DURATION_DAYS).toBe(14)
            expect(result.AI_INVITE_POINT_COST_PER_WORKER).toBe(2000)
        })

        it('[B] should use defaults when settings are absent', async () => {
            prismaMock.systemSetting.findMany.mockResolvedValue([])

            const result = await service.getPointPricing()

            expect(result.JOB_POST_POINT_COST).toBe(50000)
            expect(result.BOOST_JOB_POINT_COST).toBe(50000)
            expect(result.BOOST_JOB_DURATION_DAYS).toBe(7)
            expect(result.AI_INVITE_POINT_COST_PER_WORKER).toBe(1000)
        })
    })

    describe('resolveBoostPackage', () => {
        const mockPackages = [
            { id: 1, name: '7 days', durationDays: 7, price: 50000, isDefault: true, description: null },
            { id: 2, name: '14 days', durationDays: 14, price: 90000, isDefault: false, description: null },
        ]

        beforeEach(() => {
            prismaMock.paymentPackage.findMany.mockResolvedValue(mockPackages)
            prismaMock.systemSetting.findUnique.mockResolvedValue(null)
        })

        it('[N] should return matching package by days', async () => {
            const result = await service.resolveBoostPackage(14)
            expect(Number(result.durationDays)).toBe(14)
        })

        it('[N] should return default package when no days specified', async () => {
            const result = await service.resolveBoostPackage(undefined)
            expect(result.isDefault).toBe(true)
        })

        it('[A] should throw when packageDays does not match any package', async () => {
            await expect(service.resolveBoostPackage(999)).rejects.toThrow(BadRequestException)
        })
    })

    describe('createTopupCheckout', () => {
        it('[N] should create payment order and return QR details', async () => {
            prismaMock.companyWallet.upsert.mockResolvedValue({ id: 1, companyId: 10 })
            prismaMock.paymentOrder.create.mockResolvedValue({ id: 100, amount: 500000 })

            const result = await service.createTopupCheckout(10, 500000, 1)

            expect(result.paymentOrderId).toBe(100)
            expect(result.amount).toBe(500000)
            expect(result.paymentUrl).toContain('VCB')
            expect(result.paymentCode).toBe('BOOST100')
        })

        it('[A] should throw BadRequestException for invalid amount', async () => {
            await expect(service.createTopupCheckout(10, -100, 1)).rejects.toThrow(BadRequestException)
            await expect(service.createTopupCheckout(10, 0, 1)).rejects.toThrow(BadRequestException)
        })
    })

    describe('getTopupOrderStatus', () => {
        it('[N] should return order + wallet balance', async () => {
            prismaMock.paymentOrder.findUnique.mockResolvedValue({
                id: 100,
                userId: 1,
                targetId: 10,
                orderType: OrderType.TOPUP_WALLET,
                status: PaymentStatus.PENDING,
                amount: 500000,
                pointAmount: 500000,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            prismaMock.companyWallet.upsert.mockResolvedValue({ id: 1, balancePoint: 200000 })

            const result = await service.getTopupOrderStatus(100, 10, 1)

            expect(result.orderId).toBe(100)
            expect(result.walletBalancePoint).toBe(200000)
        })

        it('[A] should throw BadRequestException for wrong order type', async () => {
            prismaMock.paymentOrder.findUnique.mockResolvedValue({
                id: 100,
                userId: 1,
                targetId: 10,
                orderType: OrderType.BOOST_JOB,
            })

            await expect(service.getTopupOrderStatus(100, 10, 1)).rejects.toThrow(BadRequestException)
        })

        it('[A] should throw UnauthorizedException for wrong user', async () => {
            prismaMock.paymentOrder.findUnique.mockResolvedValue({
                id: 100,
                userId: 99,
                targetId: 10,
                orderType: OrderType.TOPUP_WALLET,
            })

            await expect(service.getTopupOrderStatus(100, 10, 1)).rejects.toThrow(UnauthorizedException)
        })
    })

    describe('processTopupWebhookPayload', () => {
        it('[A] should throw for null payload', async () => {
            await expect(service.processTopupWebhookPayload(null as any)).rejects.toThrow(BadRequestException)
        })

        it('[N] should ignore outgoing transfer type', async () => {
            const result = await service.processTopupWebhookPayload({ transferType: 'out', content: 'BOOST123' })
            expect(result.success).toBe(true)
            expect(result.message).toContain('Bỏ qua')
        })

        it('[N] should skip payload without order code', async () => {
            const result = await service.processTopupWebhookPayload({ transferType: 'in', content: 'NO-CODE-HERE' })
            expect(result.success).toBe(true)
        })

        it('[N] should skip already-completed order', async () => {
            prismaMock.paymentOrder.findUnique.mockResolvedValue({
                id: 1,
                orderType: OrderType.TOPUP_WALLET,
                status: PaymentStatus.COMPLETED,
                amount: 100000,
            })

            const result = await service.processTopupWebhookPayload({ content: 'BOOST1', transferAmount: 200000 })
            expect(result.message).toContain('đã xử lý')
        })

        it('[N] should skip when transfer amount is insufficient', async () => {
            prismaMock.paymentOrder.findUnique.mockResolvedValue({
                id: 1,
                orderType: OrderType.TOPUP_WALLET,
                status: PaymentStatus.PENDING,
                amount: 500000,
                targetId: 10,
            })

            const result = await service.processTopupWebhookPayload({
                content: 'BOOST1',
                transferAmount: 100000,
            })
            expect(result.message).toContain('chưa đủ')
        })
    })

    describe('processTopupWebhook', () => {
        it('[A] should throw UnauthorizedException for invalid auth', async () => {
            await expect(
                service.processTopupWebhook('apikey wrong-key', {}),
            ).rejects.toThrow(UnauthorizedException)
        })

        it('[N] should delegate to processTopupWebhookPayload when auth passes', async () => {
            const spy = jest.spyOn(service, 'processTopupWebhookPayload').mockResolvedValue({
                success: true,
                message: 'ok',
            })

            const result = await service.processTopupWebhook('apikey test-api-key', { content: 'x' })

            expect(spy).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })
    })

    describe('getWalletTransactions', () => {
        it('[N] should return paginated transactions', async () => {
            prismaMock.companyWallet.upsert.mockResolvedValue({ id: 1, balancePoint: 100000 })
            prismaMock.$transaction.mockResolvedValue([
                [{ id: 1, pointDelta: -5000 }, { id: 2, pointDelta: 50000 }],
                2,
            ])

            const result = await service.getWalletTransactions(10, 1, 20)

            expect(result.meta.total).toBe(2)
            expect(result.items).toHaveLength(2)
        })

        it('[B] should clamp limit to max 100', async () => {
            prismaMock.companyWallet.upsert.mockResolvedValue({ id: 1, balancePoint: 0 })
            prismaMock.$transaction.mockResolvedValue([[], 0])

            await service.getWalletTransactions(10, 1, 999)

            expect(prismaMock.$transaction).toHaveBeenCalled()
        })
    })

    describe('extractOrderIdFromPayload (via processTopupWebhookPayload)', () => {
        const testCases = [
            { field: 'content', value: 'BOOST42', expectedId: 42 },
            { field: 'addInfo', value: 'BOOST 100', expectedId: 100 },
            { field: 'referenceCode', value: 'BOOST-999', expectedId: 999 },
            { field: 'transactionCode', value: 'BOOST_55', expectedId: 55 },
            { field: 'code', value: 'boost7', expectedId: 7 },
        ]

        for (const tc of testCases) {
            it(`[N] should extract orderId from ${tc.field} field`, async () => {
                prismaMock.paymentOrder.findUnique.mockResolvedValue(null)

                const payload: Record<string, unknown> = {
                    transferType: 'in',
                    [tc.field]: tc.value,
                }
                const result = await service.processTopupWebhookPayload(payload)

                expect(result.success).toBe(true)
            })
        }

        it('[N] should return null/skip when prefix not found', async () => {
            const result = await service.processTopupWebhookPayload({
                content: 'UNRELATED-CONTENT',
                transferType: 'in',
            })
            expect(result.success).toBe(true)
        })
    })
})
