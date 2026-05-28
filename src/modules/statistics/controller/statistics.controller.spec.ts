import { Test, TestingModule } from '@nestjs/testing'
import { StatisticsController } from './statistics.controller'
import { StatisticsService } from '../service/statistics.service'

const mockService = {
  getOverview: jest.fn(),
  getDashboardStats: jest.fn(),
  getJobFunnelStats: jest.fn(),
  getPaymentStats: jest.fn(),
  getJobStatus: jest.fn(),
}

describe('StatisticsController', () => {
  let controller: StatisticsController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: mockService }],
    }).compile()
    controller = module.get<StatisticsController>(StatisticsController)
  })

  it('getOverview delegates to service', async () => {
    mockService.getOverview.mockResolvedValue({ totalViews: { value: 10 } })
    const result = await controller.getOverview(1)
    expect(mockService.getOverview).toHaveBeenCalledWith(1)
    expect(result.totalViews.value).toBe(10)
  })

  it('getDashboardStats delegates to service with query', async () => {
    mockService.getDashboardStats.mockResolvedValue({ applied: 5 })
    const query: any = { from: '2025-01-01', to: '2025-01-31' }
    await controller.getDashboardStats(1, query)
    expect(mockService.getDashboardStats).toHaveBeenCalledWith(1, query)
  })

  it('getJobFunnelStats delegates to service with jobId', async () => {
    mockService.getJobFunnelStats.mockResolvedValue({ applied: 3 })
    await controller.getJobFunnelStats(1, 42)
    expect(mockService.getJobFunnelStats).toHaveBeenCalledWith(1, 42)
  })

  it('getPaymentStats delegates to service with query', async () => {
    mockService.getPaymentStats.mockResolvedValue({ totalSpent: 50000 })
    const query: any = { from: '2025-01-01', to: '2025-01-31', groupBy: 'month' }
    await controller.getPaymentStats(1, query)
    expect(mockService.getPaymentStats).toHaveBeenCalledWith(1, query)
  })

  it('getJobStatus delegates to service', async () => {
    mockService.getJobStatus.mockResolvedValue({ published: 3, expired: 1 })
    const result = await controller.getJobStatus(1)
    expect(result.published).toBe(3)
  })
})
