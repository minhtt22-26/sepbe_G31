import { Module } from '@nestjs/common'
import { EmbeddingQueueService } from './service/embedding-queue.service'

@Module({
  providers: [EmbeddingQueueService],
  exports: [EmbeddingQueueService],
})
export class EmbeddingQueueModule {}
