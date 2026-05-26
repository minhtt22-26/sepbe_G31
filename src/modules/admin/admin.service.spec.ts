import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AdminService } from './admin.service'
import { PrismaService } from 'src/prisma.service'
import { OrderType } from 'src/generated/prisma/enums'

jest.mock('src/prisma.service', () => ({ PrismaService: class {} }))

const prismaMock = {
    paymentPackage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    systemSetting: {
        findMany: jest.fn(),
        upsert: jest.fn(),
    },
    user: { count: jest.fn() },
    company: { count: jest.fn() },
    job: { count: jest.fn() },
    jobApplication: { count: jest.fn() },
    jobReport: { count: jest.fn() },
    paymentOrder: { aggregate: jest.fn(), groupBy: jest.fn() },
    walletTransaction: { groupBy: jest.fn() },
    $transaction: jest.fn(),
}

describe('AdminService', () => {
    let service: AdminService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminService,
                { provide: PrismaService, useValue: prismaMock },
            ],
        }).compile()

        service = module.get<AdminService>(AdminService)
    })

    afterEach(() => jest.clearAllMocks())

    describe('getPaymentPackages', () => {
        it('[N] should return active packages by default', async () => {
            const packages = [{ id: 1, name: '7 days', isActive: true }]
            prismaMock.paymentPackage.findMany.mockResolvedValue(packages)

            const result = await service.getPaymentPackages({})

            expect(result.items).toBe(packages)
            expect(prismaMock.paymentPackage.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
            )
        })

        it('[N] should include inactive packages when requested', async () => {
            prismaMock.paymentPackage.findMany.mockResolvedValue([])

            await service.getPaymentPackages({ includeInactive: true })

            const callArg = prismaMock.paymentPackage.findMany.mock.calls[0][0]
            expect(callArg.where).not.toHaveProperty('isActive')
        })

        it('[N] should filter by orderType when provided', async () => {
            prismaMock.paymentPackage.findMany.mockResolvedValue([])

            await service.getPaymentPackages({ orderType: OrderType.BOOST_JOB })

            const callArg = prismaMock.paymentPackage.findMany.mock.calls[0][0]
            expect(callArg.where.orderType).toBe(OrderType.BOOST_JOB)
        })
    })

    describe('getPointPricingSettings', () => {
        it('[N] should return all 4 pricing keys', async () => {
            prismaMock.systemSetting.findMany.mockResolvedValue([
                { key: 'JOB_POST_POINT_COST', value: '40000', description: null },
                { key: 'BOOST_JOB_POINT_COST', value: '30000', description: null },
            ])

            const result = await service.getPointPricingSettings()

            expect(result.items).toHaveLength(4)
            const jobPost = result.items.find((i: any) => i.key === 'JOB_POST_POINT_COST')
            expect(jobPost.value).toBe(40000)
        })

        it('[B] should return 0 for missing settings', async () => {
            prismaMock.systemSetting.findMany.mockResolvedValue([])

            const result = await service.getPointPricingSettings()

            result.items.forEach((item: any) => expect(item.value).toBe(0))
        })
    })

    describe('updatePointPricingSettings', () => {
        it('[N] should upsert all settings and return updated values', async () => {
            prismaMock.$transaction.mockResolvedValue([])
            prismaMock.systemSetting.findMany.mockResolvedValue([])

            const payload = {
                JOB_POST_POINT_COST: 50000,
                BOOST_JOB_POINT_COST: 30000,
                BOOST_JOB_DURATION_DAYS: 7,
                AI_INVITE_POINT_COST_PER_WORKER: 1000,
            }

            await service.updatePointPricingSettings(payload)

            expect(prismaMock.$transaction).toHaveBeenCalled()
        })

        it('[A] should throw BadRequestException for negative value', async () => {
            await expect(
                service.updatePointPricingSettings({ JOB_POST_POINT_COST: -100 } as any),
            ).rejects.toThrow(BadRequestException)
        })

        it('[A] should throw BadRequestException when boost duration < 1', async () => {
            await expect(
                service.updatePointPricingSettings({
                    JOB_POST_POINT_COST: 50000,
                    BOOST_JOB_POINT_COST: 30000,
                    BOOST_JOB_DURATION_DAYS: 0,
                    AI_INVITE_POINT_COST_PER_WORKER: 1000,
                } as any),
            ).rejects.toThrow(BadRequestException)
        })
    })

    describe('createPaymentPackage', () => {
        it('[N] should create a boost package', async () => {
            prismaMock.paymentPackage.findFirst.mockResolvedValue(null)
            const created = { id: 1, name: '7-day boost', orderType: OrderType.BOOST_JOB }
            prismaMock.$transaction.mockResolvedValue(created)

            const result = await service.createPaymentPackage({
                name: '7-day boost',
                orderType: OrderType.BOOST_JOB,
                durationDays: 7,
                price: 50000,
                isActive: true,
                isDefault: false,
            } as any)

            expect(result.data).toBe(created)
        })

        it('[A] should throw BadRequestException when BOOST_JOB has no durationDays', async () => {
            await expect(
                service.createPaymentPackage({
                    name: 'Invalid boost',
                    orderType: OrderType.BOOST_JOB,
                    price: 50000,
                } as any),
            ).rejects.toThrow(BadRequestException)
        })

        it('[A] should throw BadRequestException for duplicate boost duration', async () => {
            prismaMock.paymentPackage.findFirst.mockResolvedValue({ id: 2 })

            await expect(
                service.createPaymentPackage({
                    name: 'Dup boost',
                    orderType: OrderType.BOOST_JOB,
                    durationDays: 7,
                    price: 50000,
                } as any),
            ).rejects.toThrow(BadRequestException)
        })
    })

    describe('updatePaymentPackage', () => {
        it('[N] should update package', async () => {
            const existing = { id: 1, name: 'Old', orderType: OrderType.BOOST_JOB, durationDays: 7 }
            prismaMock.paymentPackage.findUnique.mockResolvedValue(existing)
            prismaMock.paymentPackage.findFirst.mockResolvedValue(null)
            const updated = { id: 1, name: 'New', orderType: OrderType.BOOST_JOB }
            prismaMock.$transaction.mockResolvedValue(updated)

            const result = await service.updatePaymentPackage(1, { name: 'New' } as any)

            expect(result.data).toBe(updated)
        })

        it('[A] should throw NotFoundException when package not found', async () => {
            prismaMock.paymentPackage.findUnique.mockResolvedValue(null)

            await expect(service.updatePaymentPackage(99, {} as any)).rejects.toThrow(NotFoundException)
        })

        it('[A] should throw BadRequestException for duplicate duration on update', async () => {
            prismaMock.paymentPackage.findUnique.mockResolvedValue({
                id: 1,
                orderType: OrderType.BOOST_JOB,
                durationDays: 7,
            })
            prismaMock.paymentPackage.findFirst.mockResolvedValue({ id: 3 })

            await expect(
                service.updatePaymentPackage(1, { durationDays: 14 } as any),
            ).rejects.toThrow(BadRequestException)
        })
    })
})
