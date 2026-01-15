import { Controller, Post, Body, Get } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ApiBody, ApiTags } from '@nestjs/swagger'

@Controller('auth')
@ApiTags('Users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  getProfile() {
    // fake user id
    return this.authService.getProfile(1)
  }
  @Get('users')
  getAllUsers() {
    return this.authService.getAllUsers()
  }
}
