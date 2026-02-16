import { AuthService } from './service/auth.service'
import { AuthController } from './controller/auth.controller'
import { Module } from '@nestjs/common'
import { HelperModule } from 'src/common/helper/helper.module'
import { AuthUtil } from './utils/auth.utils'
import { JwtService } from '@nestjs/jwt'
import { SessionModule } from '../session/session.module'
import { AuthJwtAccessStrategy } from './guards/jwt/strategies/auth.jwt.access.strategy'
import { AuthSocialGoogleGuard } from './guards/social/auth.social.google.guard'

@Module({
  imports: [HelperModule, SessionModule,],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthUtil,
    JwtService,
    AuthJwtAccessStrategy,
    AuthSocialGoogleGuard
  ],
  exports: [AuthService, AuthUtil],
})
export class AuthModule { }
