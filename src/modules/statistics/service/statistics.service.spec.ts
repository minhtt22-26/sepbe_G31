import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { StatisticsService } from './statistics.service'
import { StatisticsRepository } from '../repositories/statistics.repository'
import { CompanyService } from 'src/modules/company/company.service'

const mockStatisticsRepo = {
  getOverview: jest.fn(),
  getJobEngagementStatistic: jest.fn(),
  getJobStatistic: jest.fn(),
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

  // ── getJobEngagementStatistic ─────────────────────────────────────────────

  describe('getJobEngagementStatistic', () => {
    it('delegates to repository with companyId and query', async () => {
      mockStatisticsRepo.getJobEngagementStatistic.mockResolvedValue({ views: 100 })
      const query: any = { period: 'week' }
      const result = await service.getJobEngagementStatistic(1, query)
      expect(mockStatisticsRepo.getJobEngagementStatistic).toHaveBeenCalledWith(5, query)
      expect(result).toEqual({ views: 100 })
    })
    throwsWhenNoCompany(() => service.getJobEngagementStatistic(1, {}))
  })

  // ── getJobStatistic ───────────────────────────────────────────────────────

  describe('getJobStatistic', () => {
    it('delegates to repository with companyId and jobId', async () => {
      mockStatisticsRepo.getJobStatistic.mockResolvedValue({ applied: 20 })
      const result = await service.getJobStatistic(1, 99)
      expect(mockStatisticsRepo.getJobStatistic).toHaveBeenCalledWith(5, 99)
      expect(result).toEqual({ applied: 20 })
    })
    throwsWhenNoCompany(() => service.getJobStatistic(1, 99))
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
