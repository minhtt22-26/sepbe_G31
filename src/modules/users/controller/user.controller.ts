import { Body, Controller, Post, Req, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { UserSignUpRequestDto } from "../dtos/request/user.sign-up.request.dto";
import { UserLoginResponseDto } from "../dtos/response/user.login.response.dto";
import { UserLoginRequestDto } from "../dtos/request/user.login.request.dto";
import type { Request } from 'express';
import { AuthJwtRefreshProtected, AuthJwtPayload, AuthJwtToken } from "src/modules/auth/decorators/auth.jwt.decorator";
import type { IAuthRefreshTokenPayload } from "src/modules/auth/interfaces/auth.interface";
import { AuthTokenResponseDto } from "src/modules/auth/dto/response/auth.response.token.dto";

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
}