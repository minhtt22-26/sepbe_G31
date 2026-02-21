import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { HelperModule } from "src/common/helper/helper.module";
import { SessionModule } from "../session/session.module";
import { JobService } from "./service/job.service";
import { JobRepository } from "./repositories/job.repository";
import { JobController } from "./controller/job.controller";

@Module({
    controllers: [JobController],
    providers: [JobService, JobRepository],
    exports: [JobModule]
})

export class JobModule { }