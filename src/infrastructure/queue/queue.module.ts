import { Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigService } from '@nestjs/config'
import { EmailQueueService, QUEUE_EMAIL } from './email/service/email-queue.service'
import { EmailQueueProcessor } from './email/processors/email-queue.processor'
import { EmailModule } from 'src/infrastructure/email/email.module'
import { AIMatchingModule } from 'src/modules/ai-matching/ai-matching.module'

@Global()
@Module({
  imports: [
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
    BullModule.registerQueue({ name: QUEUE_EMAIL }),
    EmailModule,
    AIMatchingModule,
  ],
  providers: [EmailQueueService, EmailQueueProcessor],
  exports: [EmailQueueService],
})
export class QueueModule {}
