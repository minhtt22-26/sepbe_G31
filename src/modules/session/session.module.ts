import { Module } from "@nestjs/common";
import { SessionTestController } from "./controller/session.controller";
import { SessionRepository } from "./repositories/session.repository";
import { SessionService } from "./service/session.service";
import { PrismaModule } from "src/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [SessionTestController],
    providers: [SessionRepository, SessionService],
    exports: [SessionService]
})

export class SessionModule { }