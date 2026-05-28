import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingQueueService, QUEUE_EMBEDDING } from './embedding-queue.service'
import { getQueueToken } from '@nestjs/bull'

const mockQueue = { add: jest.fn() }

describe('EmbeddingQueueService', () => {
  let service: EmbeddingQueueService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingQueueService,
        { provide: getQueueToken(QUEUE_EMBEDDING), useValue: mockQueue },
      ],
    }).compile()
    service = module.get<EmbeddingQueueService>(EmbeddingQueueService)
  })

  describe('queueJobEmbedding', () => {
    it('adds JOB_EMBEDDING job with jobId', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-emb-1' })
      await service.queueJobEmbedding(42)
      expect(mockQueue.add).toHaveBeenCalledWith(
        'JOB_EMBEDDING',
        { jobId: 42 },
        expect.objectContaining({ attempts: 3 }),
      )
    })
  })

  describe('queueWorkerProfileEmbedding', () => {
    it('adds PROFILE_EMBEDDING job with userId', async () => {
      mockQueue.add.mockResolvedValue({ id: 'profile-emb-1' })
      await service.queueWorkerProfileEmbedding(7)
      expect(mockQueue.add).toHaveBeenCalledWith(
        'PROFILE_EMBEDDING',
        { userId: 7 },
        expect.objectContaining({ attempts: 3 }),
      )
    })
  })
})
