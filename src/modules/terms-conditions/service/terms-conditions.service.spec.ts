import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { TermsConditionsService } from './terms-conditions.service'
import { TermsConditionsRepository } from '../repositories/terms-conditions.repository'

const mockRepo = {
  getLatestTermsConditions: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
}

describe('TermsConditionsService', () => {
  let service: TermsConditionsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermsConditionsService,
        { provide: TermsConditionsRepository, useValue: mockRepo },
      ],
    }).compile()
    service = module.get<TermsConditionsService>(TermsConditionsService)
  })

  describe('getTermsConditions', () => {
    it('returns terms when found', async () => {
      mockRepo.getLatestTermsConditions.mockResolvedValue({ id: 1, content: 'Terms...' })
      const result = await service.getTermsConditions()
      expect(result.id).toBe(1)
    })

    it('throws NotFoundException when no terms exist', async () => {
      mockRepo.getLatestTermsConditions.mockResolvedValue(null)
      await expect(service.getTermsConditions()).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateTermsConditions', () => {
    it('updates and returns terms when found', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1 })
      mockRepo.update.mockResolvedValue({ id: 1, content: 'New terms' })
      const result = await service.updateTermsConditions(1, { content: 'New terms' })
      expect(result.content).toBe('New terms')
    })

    it('throws NotFoundException when terms not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.updateTermsConditions(99, {} as any)).rejects.toThrow(NotFoundException)
    })
  })
})
