import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { StatisticsService } from './statistics.service'
import { StatisticsRepository } from '../repositories/statistics.repository'
import { CompanyService } from 'src/modules/company/company.service'

const mockStatisticsRepo = {
  getOverview: jest.fn(),
  getDashboardStats: jest.fn(),
  getJobFunnelStats: jest.fn(),
  getPaymentStats: jest.fn(),
  getJobStatus: jest.fn(),
}

const mockCompanyService = {
  findByOwnerId: jest.fn(),
}

const company = { id: 5, name: 'WorkLink Inc' }

describe('StatisticsService', () => {
  let service: StatisticsService

  beforeEach(async () => {
    jest.clearAllMocks()
    mockCompanyService.findByOwnerId.mockResolvedValue(company)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: StatisticsRepository, useValue: mockStatisticsRepo },
        { provide: CompanyService, useValue: mockCompanyService },
      ],
    }).compile()

    service = module.get<StatisticsService>(StatisticsService)
  })

  const throwsWhenNoCompany = (method: () => Promise<any>) => {
    it('throws NotFoundException when employer has no company', async () => {
      mockCompanyService.findByOwnerId.mockResolvedValue(null)
      await expect(method()).rejects.toThrow(NotFoundException)
    })
  }

  // ── getOverview ───────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('delegates to repository with companyId', async () => {
      mockStatisticsRepo.getOverview.mockResolvedValue({ jobs: 10 })
      const result = await service.getOverview(1)
      expect(mockStatisticsRepo.getOverview).toHaveBeenCalledWith(5)
      expect(result).toEqual({ jobs: 10 })
    })
    throwsWhenNoCompany(() => service.getOverview(1))
  })

  // ── getDashboardStats ─────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('delegates to repository with companyId and query', async () => {
      mockStatisticsRepo.getDashboardStats.mockResolvedValue({ views: 100 })
      const query: any = { period: 'week' }
      const result = await service.getDashboardStats(1, query)
      expect(mockStatisticsRepo.getDashboardStats).toHaveBeenCalledWith(5, query)
      expect(result).toEqual({ views: 100 })
    })
    throwsWhenNoCompany(() => service.getDashboardStats(1, {} as any))
  })

  // ── getJobFunnelStats ─────────────────────────────────────────────────────

  describe('getJobFunnelStats', () => {
    it('delegates to repository with companyId and jobId', async () => {
      mockStatisticsRepo.getJobFunnelStats.mockResolvedValue({ applied: 20 })
      const result = await service.getJobFunnelStats(1, 99)
      expect(mockStatisticsRepo.getJobFunnelStats).toHaveBeenCalledWith(5, 99)
      expect(result).toEqual({ applied: 20 })
    })
    throwsWhenNoCompany(() => service.getJobFunnelStats(1, 99))
  })

  // ── getPaymentStats ───────────────────────────────────────────────────────

  describe('getPaymentStats', () => {
    it('delegates to repository with ownerId and query', async () => {
      mockStatisticsRepo.getPaymentStats.mockResolvedValue({ spent: 50000 })
      const query: any = {}
      const result = await service.getPaymentStats(1, query)
      expect(mockStatisticsRepo.getPaymentStats).toHaveBeenCalledWith(1, query)
      expect(result).toEqual({ spent: 50000 })
    })
    throwsWhenNoCompany(() => service.getPaymentStats(1, {} as any))
  })

  // ── getJobStatus ──────────────────────────────────────────────────────────

  describe('getJobStatus', () => {
    it('delegates to repository with companyId', async () => {
      mockStatisticsRepo.getJobStatus.mockResolvedValue({ published: 5, expired: 2 })
      const result = await service.getJobStatus(1)
      expect(mockStatisticsRepo.getJobStatus).toHaveBeenCalledWith(5)
      expect(result).toEqual({ published: 5, expired: 2 })
    })
    throwsWhenNoCompany(() => service.getJobStatus(1))
  })
})
