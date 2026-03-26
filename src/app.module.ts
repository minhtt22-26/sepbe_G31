import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { appConfig } from './config/app.config'
import { HealthModule } from './modules/health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { validateEnv } from './config/validate-env'
import { PrismaModule } from './prisma.module'
import { SessionModule } from './modules/session/session.module'
import authConfig from './config/auth.config'
import { UserModule } from './modules/users/user.module'
import { CompanyModule } from './modules/company/company.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { EmailModule } from './infrastructure/email/email.module'
import { QueueModule } from './infrastructure/queue/queue.module'
import { QueueTestModule } from './modules/queue-test/queue-test.module'
import emailConfig from './config/email.config'
import embeddingConfig from './config/embedding.config'
import paymentConfig from './config/payment.config'
import { JobModule } from './modules/job/job.module'
// import { redisStore } from 'cache-manager-redis-store'
import { OccupationModule } from './modules/occupation/occupation.module'
import { SectorModule } from './modules/sector/sector.module'
import { TermsConditionsModule } from './modules/terms-conditions/terms-conditions.module'
import { ChatModule } from './modules/chat/chat.module'
import { EmbeddingModule } from './modules/embedding/embedding.module'
import { AIMatchingModule } from './modules/ai-matching/ai-matching.module'
import { ScheduleModule } from '@nestjs/schedule'
import { AdminModule } from './modules/admin/admin.module'

import { APP_GUARD } from '@nestjs/core'
import { UserStatusGuard } from './common/guards/user-status.guard'
import { AuthUserMiddleware } from './common/middleware/auth-user.middleware'
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, emailConfig, embeddingConfig, paymentConfig],
      validate: validateEnv,
    }),

    // CacheModule.registerAsync({
    //   isGlobal: true,
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => {
    //     const redisUrl = configService.getOrThrow<string>('REDIS_URL')
    //
    //     try {
    //       const store = await redisStore({
    //         url: redisUrl,
    //       })
    //
    //       if (!store || typeof store !== 'object') {
    //         throw new Error('redisStore returned invalid object')
    //       }
    //
    //       return {
    //         store,
    //         ttl: 600000,
    //       }
    //     } catch (error) {
    //       console.error(
    //         '[CACHE] ERROR initializing Redis:',
    //         error?.message || error,
    //       )
    //       throw new Error(
    //         `Cache initialization failed: ${error?.message || error}`,
    //       )
    //     }
    //   },
    // }),

    // Queue module - import early to avoid circular dependencies
    QueueModule,

    HealthModule,
    AuthModule,
    PrismaModule,
    SessionModule,
    UserModule,
    CompanyModule,
    NotificationsModule,
    EmailModule,
    // QueueTestModule,
    JobModule,
    OccupationModule,
    SectorModule,
    TermsConditionsModule,
    ChatModule,
    EmbeddingModule,
    AIMatchingModule,
    AdminModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserStatusGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthUserMiddleware).forRoutes('*')
  }
}
