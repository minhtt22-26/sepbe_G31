import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma.module";
import { JobController } from "./controller/job.controller";
import { RepositoryService } from "./repositories/repository.service";
import { JobService } from "./service/job.service";

@Module({
    imports: [PrismaModule],
    controllers: [JobController],
    providers: [RepositoryService, JobService],
    exports: [JobService]
})

export class JobModule { }