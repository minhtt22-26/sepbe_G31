import { Test, TestingModule } from '@nestjs/testing'
import { StatisticsController } from './statistics.controller'
import { StatisticsService } from '../service/statistics.service'

const mockService = {
  getOverview: jest.fn(),
  getJobEngagementStatistic: jest.fn(),
  getJobStatistic: jest.fn(),
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

  it('getJobEngagementStatistic delegates to service with query', async () => {
    mockService.getJobEngagementStatistic.mockResolvedValue({ applied: 5 })
    const query: any = { from: '2025-01-01', to: '2025-01-31' }
    await controller.getJobEngagementStatistic(1, query)
    expect(mockService.getJobEngagementStatistic).toHaveBeenCalledWith(1, query)
  })

  it('getJobStatistic delegates to service with jobId', async () => {
    mockService.getJobStatistic.mockResolvedValue({ applied: 3 })
    await controller.getJobStatistic(1, 42)
    expect(mockService.getJobStatistic).toHaveBeenCalledWith(1, 42)
  })

  it('getJobStatus delegates to service', async () => {
    mockService.getJobStatus.mockResolvedValue({ published: 3, expired: 1 })
    const result = await controller.getJobStatus(1)
    expect(result.published).toBe(3)
  })
})
