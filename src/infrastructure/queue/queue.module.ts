import { forwardRef, Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigService } from '@nestjs/config'
import { EmailQueueService, QUEUE_EMAIL } from './email/service/email-queue.service'
import { EmailQueueProcessor } from './email/processors/email-queue.processor'
import { EmailModule } from 'src/infrastructure/email/email.module'
import { AIMatchingModule } from 'src/modules/ai-matching/ai-matching.module'
import { PaymentQueueService, QUEUE_PAYMENT } from './payment/service/payment-queue.service'
import { PaymentQueueProcessor } from './payment/processors/payment-queue.processor'
import { WalletModule } from 'src/modules/wallet/wallet.module'
import { StatsQueueService, QUEUE_STATS } from './stats/service/stats-queue.service'
import { StatsQueueProcessor } from './stats/processors/stats-queue.processor'
import { PrismaModule } from 'src/prisma.module'

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
            connectTimeout: 10000,
          },
        }
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_PAYMENT },
      { name: QUEUE_STATS },
    ),
    EmailModule,
    AIMatchingModule,
    forwardRef(() => WalletModule),
    PrismaModule,
  ],
  providers: [
    // Email queue
    EmailQueueService,
    EmailQueueProcessor,
    // Payment webhook queue
    PaymentQueueService,
    PaymentQueueProcessor,
    // Stats pre-compute queue
    StatsQueueService,
    StatsQueueProcessor,
  ],
  exports: [
    EmailQueueService,
    PaymentQueueService,
    StatsQueueService,
  ],
})
export class QueueModule {}
