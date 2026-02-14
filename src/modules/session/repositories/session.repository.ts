import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { Session } from 'src/generated/prisma/client'
import { ISessionCreate, ISessionGetLogin } from '../interfaces/session.interface'


@Injectable()
export class SessionRepository {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(data: ISessionCreate): Promise<Session> {
        return this.prisma.session.create({ data })
    }

    async findByUserAndSession(
        userId: number,
        sessionId: string,
    ): Promise<ISessionGetLogin | null> {
        return this.prisma.session.findFirst({
            where: {
                id: sessionId,
                userId,
                isRevoked: false,
                expiredAt: { gte: new Date() }
            },
            select: {
                jti: true,
                expiredAt: true
            }
        })
    }

    async updateLogin(data: ISessionCreate): Promise<void> {
        await this.prisma.session.update({
            where: {
                id: data.id,
                userId: data.userId,
            },
            data: {
                jti: data.jti,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                expiredAt: data.expiredAt
            }
        })
    }

}


