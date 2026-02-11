import { Controller, Post } from "@nestjs/common";
import { SessionService } from "../service/session.service";

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
}
