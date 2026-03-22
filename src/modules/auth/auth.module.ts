import { AuthService } from './service/auth.service'
import { AuthController } from './controller/auth.controller'
import { Global, Module } from '@nestjs/common'
import { HelperModule } from 'src/common/helper/helper.module'
import { AuthUtil } from './utils/auth.utils'
import { JwtService } from '@nestjs/jwt'
import { SessionModule } from '../session/session.module'
import { AuthJwtAccessStrategy } from './guards/jwt/strategies/auth.jwt.access.strategy'
import { AuthJwtRefreshStrategy } from './guards/jwt/strategies/auth.jwt.refresh.strategy'
import { AuthSocialGoogleGuard } from './guards/social/auth.social.google.guard'
import { AuthJwtAccessGuard } from './guards/jwt/auth.jwt.access.guards'
import { AuthJwtRefreshGuard } from './guards/jwt/auth.jwt.refresh.guards'

@Global()
@Module({
  imports: [HelperModule, SessionModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthUtil,
    JwtService,
    AuthJwtAccessStrategy,
    AuthJwtRefreshStrategy,
    AuthSocialGoogleGuard,
    AuthJwtAccessGuard,
    AuthJwtRefreshGuard,
  ],
  exports: [AuthService, AuthUtil, AuthJwtAccessGuard, AuthJwtRefreshGuard],
})
export class AuthModule {}
