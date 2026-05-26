import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingService } from './embedding.service'
import embeddingConfig from 'src/config/embedding.config'

const mockEmbedContent = jest.fn()
const mockGenerateContent = jest.fn()
const mockGetGenerativeModel = jest.fn()

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
    })),
}))

const embeddingCfgMock = {
    apiKey: 'test-api-key',
    embeddingModel: 'gemini-embedding-001',
    llmModel: 'gemini-2.5-flash-lite',
    llmTemperature: 0,
}

describe('EmbeddingService', () => {
    let service: EmbeddingService

    beforeEach(async () => {
        mockGetGenerativeModel.mockReturnValue({
            embedContent: mockEmbedContent,
            generateContent: mockGenerateContent,
        })
        mockEmbedContent.mockResolvedValue({
            embedding: { values: [0.1, 0.2, 0.3] },
        })

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmbeddingService,
                { provide: embeddingConfig.KEY, useValue: embeddingCfgMock },
            ],
        }).compile()

        service = module.get<EmbeddingService>(EmbeddingService)
        await service.onModuleInit()
    })

    afterEach(() => jest.clearAllMocks())

    describe('onModuleInit / validateConnection', () => {
        it('[N] should initialize and validate Gemini connection', async () => {
            expect(mockEmbedContent).toHaveBeenCalledWith('ping')
        })

        it('[A] should throw when Gemini connection fails', async () => {
            mockEmbedContent.mockRejectedValueOnce(new Error('API key invalid'))

            await expect(service.onModuleInit()).rejects.toThrow('API key invalid')
        })
    })

    describe('generateEmbedding', () => {
        it('[N] should return embedding values array', async () => {
            mockEmbedContent.mockResolvedValue({
                embedding: { values: [0.5, 0.6, 0.7, 0.8] },
            })

            const result = await service.generateEmbedding('Backend developer Node.js React')

            expect(result).toEqual([0.5, 0.6, 0.7, 0.8])
            expect(mockEmbedContent).toHaveBeenCalledWith('Backend developer Node.js React')
        })

        it('[B] should work with empty string input', async () => {
            mockEmbedContent.mockResolvedValue({ embedding: { values: [] } })

            const result = await service.generateEmbedding('')

            expect(result).toEqual([])
        })

        it('[B] should return 768-dim vector for real model output', async () => {
            const fakeVector = Array.from({ length: 768 }, (_, i) => i * 0.001)
            mockEmbedContent.mockResolvedValue({ embedding: { values: fakeVector } })

            const result = await service.generateEmbedding('Yêu cầu kỹ năng: NestJS, TypeScript')

            expect(result).toHaveLength(768)
        })
    })

    describe('extractJobSections', () => {
        it('[N] should parse and return requirements and benefits', async () => {
            mockGenerateContent.mockResolvedValue({
                response: {
                    text: () =>
                        JSON.stringify({
                            requirements: 'NestJS, TypeScript, REST API development',
                            benefits: 'Competitive salary, remote work, annual bonus',
                        }),
                },
            })

            const result = await service.extractJobSections('We need a NestJS developer...')

            expect(result.requirements).toContain('NestJS')
            expect(result.benefits).toContain('salary')
        })

        it('[A] should throw when Gemini returns invalid JSON', async () => {
            mockGenerateContent.mockResolvedValue({
                response: { text: () => 'invalid json not object' },
            })

            await expect(
                service.extractJobSections('Job description here'),
            ).rejects.toThrow('Gemini trả về response không hợp lệ')
        })

        it('[B] should handle Vietnamese job descriptions', async () => {
            mockGenerateContent.mockResolvedValue({
                response: {
                    text: () =>
                        JSON.stringify({
                            requirements: 'Kỹ năng lập trình NestJS, kinh nghiệm 2 năm',
                            benefits: 'Lương thỏa thuận, thưởng cuối năm',
                        }),
                },
            })

            const result = await service.extractJobSections('Mô tả công việc: Cần tuyển lập trình viên...')

            expect(result.requirements).toContain('NestJS')
            expect(result.benefits).toContain('thưởng')
        })
    })
})
