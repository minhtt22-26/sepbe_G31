import { Controller, Post, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthService } from '../service/auth.service'

@Controller('auth')
@ApiTags('Users')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('test-db')
  testDatabase() {
    return this.authService.testConnection()
  }

  @Post('test-session')
  createTestSession() {
    return this.authService.createTestSession()
  }
}
