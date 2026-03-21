import { Process, Processor } from '@nestjs/bull'
import {
  EmbeddingJobName,
  QUEUE_EMBEDDING,
} from '../service/embedding-queue.service'
import { Logger } from '@nestjs/common'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
import type { Job } from 'bull'

@Processor(QUEUE_EMBEDDING)
export class EmbeddingQueueProcessor {
  private readonly logger = new Logger(EmbeddingQueueProcessor.name)

  constructor(private readonly aiMatchingService: AIMatchingService) {}

  @Process(EmbeddingJobName.JOB_EMBEDDING)
  async handleJobEmbedding(job: Job<{ jobId: number }>): Promise<void> {
    const { jobId } = job.data
    this.logger.log(`Processing JOB_EMBEDDING jobId=${jobId}`)
    await this.aiMatchingService.buildJobEmbedding(jobId)
    this.logger.log(`JOB_EMBEDDING done jobId=${jobId}`)
  }

  @Process(EmbeddingJobName.PROFILE_EMBEDDING)
  async handleProfileEmbedding(job: Job<{ userId: number }>): Promise<void> {
    const { userId } = job.data
    this.logger.log(`Processing PROFILE_EMBEDDING userId=${userId}`)
    await this.aiMatchingService.buildWorkerProfileEmbedding(userId)
    this.logger.log(`PROFILE_EMBEDDING done userId=${userId}`)
  }
}
