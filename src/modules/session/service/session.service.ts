import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { ISessionCreate } from "../interfaces/session.interface";
import { Session } from "src/generated/prisma/client";

@Injectable()
export class SessionService {
    constructor(
        private readonly sessionRepository: SessionRepository
    ) { }

    async create(data: ISessionCreate): Promise<Session> {
        return this.sessionRepository.create(data)
    }
}