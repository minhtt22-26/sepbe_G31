import { registerAs } from '@nestjs/config'

export interface IEmbeddingConfig {
  apiKey: string
  embeddingModel: string
  llmModel: string
  llmTemperature: number
  vectorDimension: number
}

export default registerAs(
  'embedding',
  (): IEmbeddingConfig => ({
    apiKey: process.env.GEMINI_API_KEY ?? '',
    embeddingModel:
      process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
    llmModel: process.env.GEMINI_LLM_MODEL ?? 'gemini-2.0-flash',
    llmTemperature: Number(process.env.GEMINI_LLM_TEMPERATURE ?? 0),
    vectorDimension: 768,
  }),
)
