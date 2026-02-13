import { AuthService } from './service/auth.service'
import { AuthController } from './controller/auth.controller'
import { Module } from '@nestjs/common'
import { HelperModule } from 'src/common/helper/helper.module'
import { AuthUtil } from './utils/auth.utils'
import { JwtService } from '@nestjs/jwt'
import { SessionModule } from '../session/session.module'
import { AuthJwtAccessStrategy } from './guards/strategies/auth.jwt.access.strategy'

@Module({
  imports: [HelperModule, SessionModule,],
  controllers: [AuthController],
  providers: [AuthService, AuthUtil, JwtService, AuthJwtAccessStrategy],
  exports: [AuthService, AuthUtil],
})
export class AuthModule { }
