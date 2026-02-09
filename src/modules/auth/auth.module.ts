import { AuthService } from './service/auth.service'
import { AuthController } from './controller/auth.controller'
import { Module } from '@nestjs/common'

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule { }
