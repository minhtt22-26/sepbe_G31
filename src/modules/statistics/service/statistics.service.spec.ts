import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { StatisticsService } from './statistics.service'
import { StatisticsRepository } from '../repositories/statistics.repository'
import { CompanyService } from 'src/modules/company/company.service'

const statsRepoMock = {
    getOverview: jest.fn(),
    getDashboardStats: jest.fn(),
    getJobFunnelStats: jest.fn(),
    getPaymentStats: jest.fn(),
    getJobStatus: jest.fn(),
}

const companyServiceMock = {
    findByOwnerId: jest.fn(),
}

const mockCompany = { id: 10, name: 'Test Company', ownerId: 1 }

describe('StatisticsService', () => {
    let service: StatisticsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StatisticsService,
                { provide: StatisticsRepository, useValue: statsRepoMock },
                { provide: CompanyService, useValue: companyServiceMock },
            ],
        }).compile()

        service = module.get<StatisticsService>(StatisticsService)
    })

    afterEach(() => jest.clearAllMocks())

    describe('getOverview', () => {
        it('[N] should return overview for company owner', async () => {
            const overview = { totalJobs: 5, totalApplications: 20 }
            companyServiceMock.findByOwnerId.mockResolvedValue(mockCompany)
            statsRepoMock.getOverview.mockResolvedValue(overview)

            const result = await service.getOverview(1)

            expect(result).toBe(overview)
            expect(statsRepoMock.getOverview).toHaveBeenCalledWith(10)
        })

        it('[A] should throw NotFoundException when owner has no company', async () => {
            companyServiceMock.findByOwnerId.mockResolvedValue(null)

            await expect(service.getOverview(1)).rejects.toThrow(NotFoundException)
        })
    })

    describe('getDashboardStats', () => {
        it('[N] should return dashboard stats', async () => {
            const stats = { views: 100, applications: 30 }
            companyServiceMock.findByOwnerId.mockResolvedValue(mockCompany)
            statsRepoMock.getDashboardStats.mockResolvedValue(stats)

            const query = { year: 2025 }
            const result = await service.getDashboardStats(1, query as any)

            expect(result).toBe(stats)
            expect(statsRepoMock.getDashboardStats).toHaveBeenCalledWith(10, query)
        })

        it('[A] should throw NotFoundException when owner has no company', async () => {
            companyServiceMock.findByOwnerId.mockResolvedValue(null)

            await expect(service.getDashboardStats(1, {} as any)).rejects.toThrow(NotFoundException)
        })
    })

    describe('getJobFunnelStats', () => {
        it('[N] should return funnel stats for a job', async () => {
            const funnel = { applied: 10, interviewed: 5, hired: 2 }
            companyServiceMock.findByOwnerId.mockResolvedValue(mockCompany)
            statsRepoMock.getJobFunnelStats.mockResolvedValue(funnel)

            const result = await service.getJobFunnelStats(1, 42)

            expect(result).toBe(funnel)
            expect(statsRepoMock.getJobFunnelStats).toHaveBeenCalledWith(10, 42)
        })

        it('[A] should throw NotFoundException when owner has no company', async () => {
            companyServiceMock.findByOwnerId.mockResolvedValue(null)

            await expect(service.getJobFunnelStats(1, 42)).rejects.toThrow(NotFoundException)
        })
    })

    describe('getPaymentStats', () => {
        it('[N] should return payment stats', async () => {
            const payStats = { totalSpent: 5000, transactions: 10 }
            companyServiceMock.findByOwnerId.mockResolvedValue(mockCompany)
            statsRepoMock.getPaymentStats.mockResolvedValue(payStats)

            const result = await service.getPaymentStats(1, {} as any)

            expect(result).toBe(payStats)
            expect(statsRepoMock.getPaymentStats).toHaveBeenCalledWith(1, {})
        })

        it('[A] should throw NotFoundException when owner has no company', async () => {
            companyServiceMock.findByOwnerId.mockResolvedValue(null)

            await expect(service.getPaymentStats(1, {} as any)).rejects.toThrow(NotFoundException)
        })
    })

    describe('getJobStatus', () => {
        it('[N] should return job status breakdown', async () => {
            const status = { published: 3, closed: 1, draft: 2 }
            companyServiceMock.findByOwnerId.mockResolvedValue(mockCompany)
            statsRepoMock.getJobStatus.mockResolvedValue(status)

            const result = await service.getJobStatus(1)

            expect(result).toBe(status)
            expect(statsRepoMock.getJobStatus).toHaveBeenCalledWith(10)
        })

        it('[A] should throw NotFoundException when owner has no company', async () => {
            companyServiceMock.findByOwnerId.mockResolvedValue(null)

            await expect(service.getJobStatus(1)).rejects.toThrow(NotFoundException)
        })
    })
})
