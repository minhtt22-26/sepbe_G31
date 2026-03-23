import { forwardRef, Module } from '@nestjs/common'
import { JobService } from './service/job.service'
import { JobRepository } from './repositories/job.repository'
import { AuthModule } from '../auth/auth.module'
import { JobController } from './controller/job.controller'
import { PrismaModule } from 'src/prisma.module'
import { CompanyModule } from '../company/company.module'
import { AIMatchingModule } from '../ai-matching/ai-matching.module'

@Module({
  imports: [PrismaModule, AuthModule, CompanyModule, forwardRef(() => AIMatchingModule)],
  controllers: [JobController],
  providers: [JobService, JobRepository],
  exports: [JobService, JobRepository],
})
export class JobModule {}
