import { Controller, Get, Query } from '@nestjs/common'
import { AIMatchingService } from '../service/ai-matching.service'
import { ApiBearerAuth } from '@nestjs/swagger'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator'

@Controller('ai-matching')
export class AIMatchingController {
  constructor(private readonly aiMatchingService: AIMatchingService) {}

  @Get('jobs')
  @ApiBearerAuth('access-token')
  @AuthJwtAccessProtected()
  async getMatchedJobs(
    @AuthJwtPayload('userId') userId: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiMatchingService.getMatchedJobs(userId, Number(limit) || 10)
  }
}
