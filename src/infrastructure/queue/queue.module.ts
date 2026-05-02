import { Global, Module } from '@nestjs/common'
import { AIMatchingModule } from 'src/modules/ai-matching/ai-matching.module'

@Global()
@Module({
  imports: [
    /*
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.getOrThrow<string>('REDIS_URL')
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
  exports: [
    /* EmailQueueService, EmbeddingQueueService */
  ],
})
export class QueueModule {}
