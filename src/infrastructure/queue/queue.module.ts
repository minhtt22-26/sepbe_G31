import { Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigService } from '@nestjs/config'
import {
  EmailQueueService,
  QUEUE_EMAIL,
} from './email/service/email-queue.service'
import { EmailQueueProcessor } from './email/processors/email-queue.processor'
import {
  EmbeddingQueueService,
  QUEUE_EMBEDDING,
} from './embedding/service/embedding-queue.service'
import { EmbeddingQueueProcessor } from './embedding/processors/embedding-queue.processors'
import { AIMatchingModule } from 'src/modules/ai-matching/ai-matching.module'

@Global()
@Module({
  imports: [
    /*
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.getOrThrow<string>('REDIS_URL')
        console.log('[QUEUE] Initializing Bull with Redis')
        return {
          redis: {
            url: redisUrl,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        }
      },
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_EMAIL,
      },
      {
        name: QUEUE_EMBEDDING,
      },
    ),
    */
    AIMatchingModule,
  ],
  providers: [
    // EmailQueueService,
    // EmailQueueProcessor,
    // EmbeddingQueueService,
    // EmbeddingQueueProcessor,
  ],
  exports: [/* EmailQueueService, EmbeddingQueueService */],
})
export class QueueModule {}
