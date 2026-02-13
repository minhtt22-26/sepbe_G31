import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig],
      validate: validateEnv,
    }),
    HealthModule,
    AuthModule,
    PrismaModule,
    SessionModule,
    UserModule,
    CompanyModule,
    NotificationsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
