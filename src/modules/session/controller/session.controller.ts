import { Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { SessionService } from "../service/session.service";
import { AuthJwtAccessProtected, AuthJwtPayload } from "src/modules/auth/decorators/auth.jwt.decorator";
import { SessionListResponseDto } from "../dtos/response/session.list.response.dto";
import type { Request } from 'express';


@Controller('session-test')
export class SessionTestController {
    constructor(
        private readonly sessionService: SessionService
    ) { }

    @Post('create')
    async testCreate() {
        const testData = {
            id: "123",
            userId: 1,
            jti: 'test-jti' + Date.now(),
            ipAddress: '127.0.0.1',
            userAgent: "Chome",
            expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }

        const session = await this.sessionService.create(testData)

        return {
            success: true,
            message: "Session Created",
            session: {
                id: session.id,
                userId: session.userId,
                ipAddress: session.ipAddress,
                expiredAt: session.expiredAt
            }
        }
    }

    @Get('list')
    @AuthJwtAccessProtected()
    async list(
        @AuthJwtPayload('userId') userId: number
    ): Promise<SessionListResponseDto[]> {
        return this.sessionService.getList(userId)
    }

    @Delete('revoke/:sessionId')
    @AuthJwtAccessProtected()
    async revoke(
        @Param('sessionId') sessionId: string,
        @AuthJwtPayload('userId') userId: number,
        @Req() req: Request
    ): Promise<void> {
        await this.sessionService.revoke(userId, sessionId, {
            ipAddress: req.ip || "",
            userAgent: req.headers['user-agent'] as string || ""
        })
    }
}
