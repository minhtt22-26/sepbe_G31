import { Body, Controller, Post, Put, Req, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { UserSignUpRequestDto } from "../dtos/request/user.sign-up.request.dto";
import { UserLoginResponseDto } from "../dtos/response/user.login.response.dto";
import { UserLoginRequestDto } from "../dtos/request/user.login.request.dto";
import type { Request } from 'express';
import { AuthJwtRefreshProtected, AuthJwtPayload, AuthJwtToken } from "src/modules/auth/decorators/auth.jwt.decorator";
import type { IAuthRefreshTokenPayload } from "src/modules/auth/interfaces/auth.interface";
import { AuthTokenResponseDto } from "src/modules/auth/dto/response/auth.response.token.dto";
import { ResetPasswordRequestDto } from "src/modules/auth/dto/request/reset-password.request.dto";
import { ForgotPasswordRequestDto } from "src/modules/auth/dto/request/forgot-password.request.dto";
import { AuthSocialGoogleProtected } from "src/modules/auth/decorators/auth.social.decorator";
import { UserCreateSocialRequestDto } from "../dtos/request/user.create-social.request.dto";
import { EnumUserLoginWith } from "src/generated/prisma/enums";

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @Post('sign-up')
    async signUp(
        @Body() body: UserSignUpRequestDto,
    ): Promise<void> {
        return this.userService.signUp(body)
    }

    @Post('login/credential')
    async loginWithCredential(
        @Body() body: UserLoginRequestDto,
        @Req() req: Request
    ): Promise<UserLoginResponseDto> {
        return await this.userService.loginCrendential(
            body,
            {
                ipAddress: req.ip || "",
                userAgent: req.headers['user-agent'] as string || ""
            })
    }

    @Post('refresh')
    @AuthJwtRefreshProtected()
    async refreshToken(
        @AuthJwtPayload() user: IAuthRefreshTokenPayload,
        @AuthJwtToken() refreshToken: string,
        @Req() req: Request
    ): Promise<AuthTokenResponseDto> {
        const userFromDb = await this.userService.findOneById(user.userId)

        if (!userFromDb) {
            throw new UnauthorizedException({
                message: "User not found"
            })
        }

        return await this.userService.refreshToken(
            userFromDb,
            refreshToken,
            {
                ipAddress: req.ip || "",
                userAgent: req.headers['user-agent'] as string || ""
            }
        )

    }

    @Post('forgot-password')
    async forgotPassword(
        @Body() body: ForgotPasswordRequestDto,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        await this.userService.forgotPassword(body, {
            ipAddress: req.ip ?? 'unknown',
            userAgent: req.headers['user-agent'] ?? 'unknown',
        });

        return {
            message: 'If an account exists with this email, a reset link has been sent.',
        };
    }

    @Put('reset-password')
    async resetPassword(
        @Body() body: ResetPasswordRequestDto,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        await this.userService.resetPassword(body, {
            ipAddress: req.ip ?? 'unknown',
            userAgent: req.headers['user-agent'] ?? 'unknown',
        });

        return {
            message: 'Password has been reset successfully.',
        };
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
            }
        );
    }

}