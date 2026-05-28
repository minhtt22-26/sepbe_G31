import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingQueueProcessor } from './embedding-queue.processors'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'

const mockAIMatchingService = {
  buildJobEmbedding: jest.fn(),
  buildWorkerProfileEmbedding: jest.fn(),
}

describe('EmbeddingQueueProcessor', () => {
  let processor: EmbeddingQueueProcessor

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingQueueProcessor,
        { provide: AIMatchingService, useValue: mockAIMatchingService },
      ],
    }).compile()
    processor = module.get<EmbeddingQueueProcessor>(EmbeddingQueueProcessor)
  })

  describe('handleJobEmbedding', () => {
    it('calls buildJobEmbedding with jobId from job data', async () => {
      mockAIMatchingService.buildJobEmbedding.mockResolvedValue(undefined)
      await processor.handleJobEmbedding({ data: { jobId: 5 } } as any)
      expect(mockAIMatchingService.buildJobEmbedding).toHaveBeenCalledWith(5)
    })

    it('propagates error when buildJobEmbedding fails', async () => {
      mockAIMatchingService.buildJobEmbedding.mockRejectedValue(new Error('AI error'))
      await expect(processor.handleJobEmbedding({ data: { jobId: 5 } } as any)).rejects.toThrow('AI error')
    })
  })

  describe('handleProfileEmbedding', () => {
    it('calls buildWorkerProfileEmbedding with userId from job data', async () => {
      mockAIMatchingService.buildWorkerProfileEmbedding.mockResolvedValue(undefined)
      await processor.handleProfileEmbedding({ data: { userId: 3 } } as any)
      expect(mockAIMatchingService.buildWorkerProfileEmbedding).toHaveBeenCalledWith(3)
    })

    it('propagates error when buildWorkerProfileEmbedding fails', async () => {
      mockAIMatchingService.buildWorkerProfileEmbedding.mockRejectedValue(new Error('Profile error'))
      await expect(processor.handleProfileEmbedding({ data: { userId: 3 } } as any)).rejects.toThrow('Profile error')
    })
  })
})
