import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { ISessionCreate, ISessionGetLogin } from "../interfaces/session.interface";
import { Session } from "src/generated/prisma/client";
import { SessionUtil } from "../utils/session.util";

@Injectable()
export class SessionService {
    constructor(
        private readonly sessionUtil: SessionUtil,
        private readonly sessionRepository: SessionRepository,
    ) { }

    async create(data: ISessionCreate): Promise<Session> {
        return this.sessionRepository.create(data)
    }

    async getLogin(
        userId: number,
        sessionId: string
    ): Promise<ISessionGetLogin | null> {
        const userIdNum = this.sessionUtil.toNumberId(userId)
        const session = await this.sessionRepository.findByUserAndSession(
            userIdNum,
            sessionId
        )

        if (!session) {
            return null
        }

        return { jti: session.jti }
    }
}