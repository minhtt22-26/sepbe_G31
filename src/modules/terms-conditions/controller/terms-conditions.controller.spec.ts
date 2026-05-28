import { Test, TestingModule } from '@nestjs/testing'
import { TermsConditionsController } from './terms-conditions.controller'
import { TermsConditionsService } from '../service/terms-conditions.service'

const mockService = {
  getTermsConditions: jest.fn(),
  updateTermsConditions: jest.fn(),
}

describe('TermsConditionsController', () => {
  let controller: TermsConditionsController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermsConditionsController],
      providers: [{ provide: TermsConditionsService, useValue: mockService }],
    }).compile()
    controller = module.get<TermsConditionsController>(TermsConditionsController)
  })

  it('getTermsConditions delegates to service', async () => {
    mockService.getTermsConditions.mockResolvedValue({ id: 1, content: 'Terms' })
    const result = await controller.getTermsConditions()
    expect(mockService.getTermsConditions).toHaveBeenCalled()
    expect(result.id).toBe(1)
  })

  it('updateTermsConditions delegates to service with id and dto', async () => {
    mockService.updateTermsConditions.mockResolvedValue({ id: 1, content: 'New' })
    const dto: any = { content: 'New' }
    await controller.updateTermsConditions(1, dto)
    expect(mockService.updateTermsConditions).toHaveBeenCalledWith(1, dto)
  })
})
