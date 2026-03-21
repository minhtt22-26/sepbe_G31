import { forwardRef, Module } from '@nestjs/common'
import { AIMatchingService } from './service/ai-matching.service'
import { AIMatchingRepository } from './repositories/ai-matching.repository'
import { AIMatchingController } from './controller/ai-matching.controller'
import { UserModule } from '../users/user.module'
import { ScoringService } from './service/scoring.service'
import { JobModule } from '../job/job.module'
import { EmbeddingModule } from '../embedding/embedding.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    AuthModule,
    forwardRef(() => UserModule),
    forwardRef(() => JobModule),
    EmbeddingModule,
  ],
  providers: [AIMatchingService, AIMatchingRepository, ScoringService],
  controllers: [AIMatchingController],
  exports: [AIMatchingService, AIMatchingRepository],
})
export class AIMatchingModule {}
