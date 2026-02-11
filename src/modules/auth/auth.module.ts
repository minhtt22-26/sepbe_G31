import { AuthService } from './service/auth.service'
import { AuthController } from './controller/auth.controller'
import { Module } from '@nestjs/common'
import { HelperModule } from 'src/common/helper/helper.module'
import { AuthUtil } from './utils/auth.utils'
import { JwtService } from '@nestjs/jwt'

@Module({
  imports: [HelperModule],
  controllers: [AuthController],
  providers: [AuthService, AuthUtil, JwtService],
  exports: [AuthService, AuthUtil],
})
export class AuthModule { }
