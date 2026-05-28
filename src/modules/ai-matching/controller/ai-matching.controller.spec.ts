import { Test, TestingModule } from '@nestjs/testing'
import { AIMatchingController } from './ai-matching.controller'
import { AIMatchingService } from '../service/ai-matching.service'

const mockService = {
  getMatchedJobs: jest.fn(),
  getSuggestedWorkers: jest.fn(),
  getConfigs: jest.fn(),
  updateConfigs: jest.fn(),
}

describe('AIMatchingController', () => {
  let controller: AIMatchingController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIMatchingController],
      providers: [{ provide: AIMatchingService, useValue: mockService }],
    }).compile()
    controller = module.get<AIMatchingController>(AIMatchingController)
  })

  it('getMatchedJobs delegates to service with userId', async () => {
    mockService.getMatchedJobs.mockResolvedValue([{ job: { id: 1 } }])
    const result = await controller.getMatchedJobs(5)
    expect(mockService.getMatchedJobs).toHaveBeenCalledWith(5)
    expect(result).toHaveLength(1)
  })

  it('getSuggestedWorkers delegates to service with jobId', async () => {
    mockService.getSuggestedWorkers.mockResolvedValue([{ worker: { userId: 2 } }])
    const result = await controller.getSuggestedWorkers(3)
    expect(mockService.getSuggestedWorkers).toHaveBeenCalledWith(3)
    expect(result).toHaveLength(1)
  })

  it('getConfigs delegates to service', async () => {
    mockService.getConfigs.mockResolvedValue([{ key: 'SKILL_WEIGHT', value: 0.3 }])
    const result = await controller.getConfigs()
    expect(mockService.getConfigs).toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })

  it('updateConfigs delegates to service with configs array', async () => {
    const dto = { configs: [{ key: 'SKILL_WEIGHT', value: 0.3 }] }
    mockService.updateConfigs.mockResolvedValue(dto.configs)
    await controller.updateConfigs(dto as any)
    expect(mockService.updateConfigs).toHaveBeenCalledWith(dto.configs)
  })
})
