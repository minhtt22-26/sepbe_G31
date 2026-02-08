import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'
import { CurrentUser } from 'src/common/decorators/current-user.decorator'

@Controller('auth')
@ApiTags('Users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('register')
  // register(@Body() dto: RegisterDto) {
  //   return this.authService.register(dto)
  // }

  // @Post('login')
  // @ApiBody({ type: LoginDto })
  // login(@Body() dto: LoginDto) {
  //   return this.authService.login(dto)
  // }

  @Get('users')
  getAllUsers() {
    return this.authService.getAllUsers()
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('me')
  // @ApiBearerAuth('access-token')
  // getProfile(@CurrentUser() user: any) {
  //   console.log('current user', user)

  //   return this.authService.getProfile(user.id)
  // }
}
