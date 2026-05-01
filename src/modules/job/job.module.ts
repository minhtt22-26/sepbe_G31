import { forwardRef, Module } from '@nestjs/common'
import { JobService } from './service/job.service'
import { JobRepository } from './repositories/job.repository'
import { AuthModule } from '../auth/auth.module'
import { JobModerationService } from './service/job-moderation.service'
import { JobController } from './controller/job.controller'
import { PrismaModule } from 'src/prisma.module'
import { CompanyModule } from '../company/company.module'
import { AIMatchingModule } from '../ai-matching/ai-matching.module'
import { WalletModule } from '../wallet/wallet.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CompanyModule,
    WalletModule,
    forwardRef(() => AIMatchingModule),
  ],
  controllers: [JobController],
  providers: [JobService, JobRepository, JobModerationService],
  exports: [JobService, JobRepository, JobModerationService],
})
export class JobModule { }
