import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
} from '@nestjs/common'
import { UserService } from '../service/user.service'
import { UserSignUpRequestDto } from '../dtos/request/user.sign-up.request.dto'
import { UserLoginResponseDto } from '../dtos/response/user.login.response.dto'
import { UserLoginRequestDto } from '../dtos/request/user.login.request.dto'
import type { Request } from 'express'
import {
  AuthJwtRefreshProtected,
  AuthJwtPayload,
  AuthJwtToken,
  AuthJwtAccessProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import type { IAuthRefreshTokenPayload } from 'src/modules/auth/interfaces/auth.interface'
import { AuthTokenResponseDto } from 'src/modules/auth/dto/response/auth.response.token.dto'
import { ResetPasswordRequestDto } from 'src/modules/auth/dto/request/reset-password.request.dto'
import { ForgotPasswordRequestDto } from 'src/modules/auth/dto/request/forgot-password.request.dto'
import { AuthSocialGoogleProtected } from 'src/modules/auth/decorators/auth.social.decorator'
import { UserCreateSocialRequestDto } from '../dtos/request/user.create-social.request.dto'
import { EnumUserLoginWith } from 'src/generated/prisma/enums'
import { User, WorkerProfile } from 'src/generated/prisma/client'
import { WorkerProfileRequestDto } from '../dtos/request/user.profile.request.dto'
import { UserInfoRequestDto } from '../dtos/request/user.info.request.dto'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('sign-up')
  async signUp(@Body() body: UserSignUpRequestDto): Promise<void> {
    return this.userService.signUp(body)
  }

  @Post('login/credential')
  async loginWithCredential(
    @Body() body: UserLoginRequestDto,
    @Req() req: Request,
  ): Promise<UserLoginResponseDto> {
    return await this.userService.loginCrendential(body, {
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
    })
  }

  @Post('refresh')
  @AuthJwtRefreshProtected()
  async refreshToken(
    @AuthJwtPayload() user: IAuthRefreshTokenPayload,
    @AuthJwtToken() refreshToken: string,
    @Req() req: Request,
  ): Promise<AuthTokenResponseDto> {
    const userFromDb = await this.userService.getUserById(user.userId)

    return await this.userService.refreshToken(userFromDb, refreshToken, {
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
    })
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() body: ForgotPasswordRequestDto,
    @Req() req: Request,
  ): Promise<void> {
    return await this.userService.forgotPassword(body, {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    })

  }

  @Put('reset-password')
  async resetPassword(
    @Body() body: ResetPasswordRequestDto,
    @Req() req: Request,
  ): Promise<void> {
    return await this.userService.resetPassword(body, {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    })
  }

  @Post('login/social/google')
  @AuthSocialGoogleProtected()
  async loginWithGoogle(
    @AuthJwtPayload('email') email: string,
    @Body() body: UserCreateSocialRequestDto,
    @Req() req: Request,
  ): Promise<UserLoginResponseDto> {
    return this.userService.loginWithSocial(
      email,
      EnumUserLoginWith.SOCIAL_GOOGLE,
      body,
      {
        ipAddress: req.ip ?? 'unknown',
        userAgent: req.headers['user-agent'] ?? 'unknown',
      },
    )
  }

  @Get('user-info')
  @AuthJwtAccessProtected()
  async getUserInfo(@AuthJwtPayload('userId') userId: number): Promise<User> {
    return await this.userService.getUserById(userId)
  }

  @Post('worker-profile')
  @AuthJwtAccessProtected()
  async createWorkerProfile(
    @AuthJwtPayload('userId') userId: number,
    @Body() body: WorkerProfileRequestDto,
  ): Promise<WorkerProfile> {
    return await this.userService.createWorkerProfile(userId, body)
  }

  @Get('worker-profile')
  @AuthJwtAccessProtected()
  async getWorkerProfile(
    @AuthJwtPayload('userId') userId: number,
  ): Promise<WorkerProfile> {
    return await this.userService.getWorkerProfile(userId)
  }

  @Put('user-info')
  @AuthJwtAccessProtected()
  async updateInfoUser(
    @AuthJwtPayload('userId') userId: number,
    @Body() body: UserInfoRequestDto,
  ): Promise<User> {
    return await this.userService.updateInfoUser(userId, body)
  }

  @Post('logout')
  @AuthJwtAccessProtected()
  async logout(
    @AuthJwtPayload('userId') userId: number,
    @AuthJwtPayload('sessionId') sessionId: string,
    @Req() req: Request,
  ): Promise<void> {
    return await this.userService.logout(userId, sessionId, {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    })
  }
}
