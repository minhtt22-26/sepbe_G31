import { Body, Controller, Post, Req } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { UserSignUpRequestDto } from "../dtos/request/user.sign-up.request.dto";
import { UserLoginResponseDto } from "../dtos/response/user.login.response.dto";
import { UserLoginRequestDto } from "../dtos/request/user.login.request.dto";
import type { Request } from 'express';

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
}