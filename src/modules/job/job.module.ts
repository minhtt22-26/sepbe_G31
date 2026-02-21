import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { HelperModule } from "src/common/helper/helper.module";
import { SessionModule } from "../session/session.module";
import { JobService } from "./service/job.service";
import { JobRepository } from "./repositories/job.repository";
import { JobController } from "./controller/job.controller";
import { PrismaModule } from "src/prisma.module";
import { RepositoryService } from "./repositories/repository.service";

@Module({
    imports: [PrismaModule],
    controllers: [JobController],
    providers: [JobService, JobRepository, RepositoryService],
    exports: [JobModule]
})

export class JobModule { }
