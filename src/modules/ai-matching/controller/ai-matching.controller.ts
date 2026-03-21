import { Body, Controller, Get, Put, Query } from '@nestjs/common'
import { AIMatchingService } from '../service/ai-matching.service'
import {
  AuthJwtPayload,
  AuthRoleProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { UpdateWeightsRequestDto } from '../dto/request/update-weight.request.dto'

@Controller('ai-matching')
export class AIMatchingController {
  constructor(private readonly aiMatchingService: AIMatchingService) {}

  @Get('jobs')
  @AuthRoleProtected(EnumUserRole.WORKER)
  async getMatchedJobs(
    @AuthJwtPayload('userId') userId: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiMatchingService.getMatchedJobs(userId, Number(limit) || 10)
  }

  @Get('weights')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  async getWeights() {
    return this.aiMatchingService.getWeights()
  }

  @Put('weights')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  async updateWeights(@Body() dto: UpdateWeightsRequestDto) {
    return this.aiMatchingService.updateWeights(dto.weights)
  }
}
