import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import type { Queue } from 'bull'

export const QUEUE_EMBEDDING = 'embedding'

export enum EmbeddingJobName {
  JOB_EMBEDDING = 'JOB_EMBEDDING',
  PROFILE_EMBEDDING = 'PROFILE_EMBEDDING',
}

@Injectable()
export class EmbeddingQueueService {
  private readonly logger = new Logger(EmbeddingQueueService.name)

  constructor(
    @InjectQueue(QUEUE_EMBEDDING)
    private readonly embeddingQueue: Queue,
  ) {}

  async queueJobEmbedding(jobId: number): Promise<void> {
    await this.embeddingQueue.add(
      EmbeddingJobName.JOB_EMBEDDING,
      { jobId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    )
    this.logger.log(`Queued JOB_EMBEDDING for jobID: ${jobId}`)
  }

  async queueWorkerProfileEmbedding(userId: number): Promise<void> {
    this.logger.log(`Queued PROFILE_EMBEDDING for userId=${userId}`)
    await this.embeddingQueue.add(
      EmbeddingJobName.PROFILE_EMBEDDING,
      { userId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    )
    this.logger.log(`Queued PROFILE_EMBEDDING for userId=${userId}`)
  }
}
