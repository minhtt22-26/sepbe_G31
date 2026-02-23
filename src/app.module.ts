import { Module } from '@nestjs/common'
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
import { JobModule } from './modules/job/job.module'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-store'
import { OccupationModule } from './modules/occupation/occupation.module'
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, emailConfig],
      validate: validateEnv,
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.getOrThrow<string>('REDIS_URL')

        try {
          const store = await redisStore({
            url: redisUrl,
          })

          if (!store || typeof store !== 'object') {
            throw new Error('redisStore returned invalid object')
          }

          return {
            store,
            ttl: 600000,
          }
        } catch (error) {
          console.error('[CACHE] ERROR initializing Redis:', error?.message || error)
          throw new Error(`Cache initialization failed: ${error?.message || error}`)
        }
      },
    }),

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
    QueueTestModule,
    JobModule,
    OccupationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
