import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { Session } from 'src/generated/prisma/client'
import { ISessionCreate } from '../interfaces/session.interface'


@Injectable()
export class SessionRepository {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(data: ISessionCreate): Promise<Session> {
        return this.prisma.session.create({ data })
    }

}


