import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigService } from '@nestjs/config'
import { EmailQueueService, QUEUE_EMAIL } from './services/email-queue.service'
import { EmailQueueProcessor } from './processors/email-queue.processor'

@Module({
  imports: [
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
    BullModule.registerQueue({
      name: QUEUE_EMAIL,
    }),
  ],
  providers: [EmailQueueService, EmailQueueProcessor],
  exports: [EmailQueueService],
})
export class QueueModule {}
