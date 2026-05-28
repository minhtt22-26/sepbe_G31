import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingService } from './embedding.service'
import embeddingConfig from 'src/config/embedding.config'

// Mock GoogleGenerativeAI
const mockModel = {
  embedContent: jest.fn(),
  generateContent: jest.fn(),
}

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue(mockModel),
  })),
}))

const mockConfig = {
  apiKey: 'fake-api-key',
  embeddingModel: 'gemini-embedding-001',
  llmModel: 'gemini-2.5-flash-lite',
  llmTemperature: 0.1,
}

describe('EmbeddingService', () => {
  let service: EmbeddingService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: embeddingConfig.KEY, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<EmbeddingService>(EmbeddingService)
    // Manually init to avoid real HTTP call
    ;(service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    }
  })

  // ── generateEmbedding ─────────────────────────────────────────────────────

  describe('generateEmbedding', () => {
    it('returns embedding values from Gemini', async () => {
      mockModel.embedContent.mockResolvedValue({ embedding: { values: [0.1, 0.2, 0.3] } })
      const result = await service.generateEmbedding('some text')
      expect(result).toEqual([0.1, 0.2, 0.3])
    })

    it('propagates error when embedContent fails', async () => {
      mockModel.embedContent.mockRejectedValue(new Error('API quota exceeded'))
      await expect(service.generateEmbedding('text')).rejects.toThrow('API quota exceeded')
    })
  })

  // ── extractJobSections ────────────────────────────────────────────────────

  describe('extractJobSections', () => {
    it('returns parsed requirements and benefits', async () => {
      const mockResponse = { requirements: 'Need 3 years experience', benefits: 'Free lunch' }
      mockModel.generateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockResponse) },
      })
      const result = await service.extractJobSections('Cần người code NestJS')
      expect(result.requirements).toBe('Need 3 years experience')
      expect(result.benefits).toBe('Free lunch')
    })

    it('throws when Gemini returns invalid JSON', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'not-json' },
      })
      await expect(service.extractJobSections('some JD')).rejects.toThrow()
    })
  })

  // ── onModuleInit / validateConnection ─────────────────────────────────────

  describe('onModuleInit', () => {
    it('logs success when connection succeeds', async () => {
      mockModel.embedContent.mockResolvedValue({ embedding: { values: [] } })
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => {})
      await service.onModuleInit()
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('connected'))
    })

    it('throws and logs error when connection fails', async () => {
      mockModel.embedContent.mockRejectedValue(new Error('Connection refused'))
      jest.spyOn((service as any).logger, 'error').mockImplementation(() => {})
      await expect(service.onModuleInit()).rejects.toThrow('Connection refused')
    })
  })
})
