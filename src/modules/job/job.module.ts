import { forwardRef, Module } from '@nestjs/common'
import { JobService } from './service/job.service'
import { JobRepository } from './repositories/job.repository'
import { AuthModule } from '../auth/auth.module'
import { JobController } from './controller/job.controller'
import { PrismaModule } from 'src/prisma.module'
import { CompanyModule } from '../company/company.module'
import { AIMatchingModule } from '../ai-matching/ai-matching.module'
import { SepayService } from './service/sepay.service'

@Module({
  imports: [PrismaModule, AuthModule, CompanyModule, forwardRef(() => AIMatchingModule)],
  controllers: [JobController],
  providers: [JobService, JobRepository, SepayService],
  exports: [JobService, JobRepository],
})
export class JobModule {}
