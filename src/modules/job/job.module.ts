import { Module } from "@nestjs/common";
import { JobService } from "./service/job.service";
import { JobRepository } from "./repositories/job.repository";
import { JobController } from "./controller/job.controller";
import { PrismaModule } from "src/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [JobController],
    providers: [JobService, JobRepository],
    exports: [JobModule]
})

export class JobModule { }
