import { Body, Controller, Get, Put, Query } from '@nestjs/common'
import { AIMatchingService } from '../service/ai-matching.service'
import {
  AuthJwtPayload,
  AuthRoleProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { UpdateConfigsRequestDto } from '../dto/request/update-config.request.dto'

@Controller('ai-matching')
export class AIMatchingController {
  constructor(private readonly aiMatchingService: AIMatchingService) {}

  @Get('jobs')
  @AuthRoleProtected(
    EnumUserRole.ADMIN,
    EnumUserRole.EMPLOYER,
    EnumUserRole.MANAGER,
    EnumUserRole.WORKER,
  )
  async getMatchedJobs(
    @AuthJwtPayload('userId') userId: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiMatchingService.getMatchedJobs(userId, Number(limit) || 10)
  }

  @Get('workers')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getSuggestedWorkers(
    @Query('jobId') jobId: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiMatchingService.getSuggestedWorkers(jobId, limit || 10)
  }

  @Get('configs')
  @AuthRoleProtected(EnumUserRole.ADMIN)
  async getConfigs() {
    return this.aiMatchingService.getConfigs()
  }

  @Put('configs')
  @AuthRoleProtected(EnumUserRole.ADMIN)
  async updateConfigs(@Body() dto: UpdateConfigsRequestDto) {
    return this.aiMatchingService.updateConfigs(dto.configs)
  }
}
