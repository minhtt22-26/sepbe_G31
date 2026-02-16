import { Injectable, NotFoundException } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { ISessionCreate, ISessionGetLogin } from "../interfaces/session.interface";
import { Session } from "src/generated/prisma/client";
import { SessionUtil } from "../utils/session.util";
import { plainToInstance } from "class-transformer";
import { SessionListResponseDto } from "../dtos/response/session.list.response.dto";

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

        return { 
            jti: session.jti, 
            expiredAt: session.expiredAt 
        }
    }

    async updateLogin(data: ISessionCreate): Promise<void> {
        const userIdNum = this.sessionUtil.toNumberId(data.userId)
        await this.sessionRepository.updateLogin({ ...data, userId: userIdNum })
    }

    async getList(
        userId: number
    ): Promise<SessionListResponseDto[]>{
        const userIdNum = this.sessionUtil.toNumberId(userId)
        const sessions = await this.sessionRepository.findAll(userIdNum)
        
        return plainToInstance(SessionListResponseDto, sessions, {
            excludeExtraneousValues: true
        })
    }

    async revoke(
        userId: number,
        sessionId: string,
        requestLog: {
            ipAddress: string,
            userAgent: string
        }
    ): Promise<void> {
        const userIdNum = this.sessionUtil.toNumberId(userId)
        const session = await this.sessionRepository.findByUserAndSession(
            userIdNum,
            sessionId
        )

        if(!session) {
            throw new NotFoundException({
                message: "Session not found or already expired"
            })
        }

        await this.sessionRepository.revoke(userIdNum, sessionId, requestLog)
    }
}