import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { StatisticsService } from '../service/statistics.service'
import { AuthJwtAccessGuard } from 'src/modules/auth/guards/jwt/auth.jwt.access.guards'
import {
  AuthJwtPayload,
  AuthRoleProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { PaymentStatsRequestDto } from '../dtos/request/payment-stats.request.dto'

@Controller('statistics')
@UseGuards(AuthJwtAccessGuard)
export class StatisticsController {
  constructor(private readonly statisticService: StatisticsService) {}

  @Get('employer/overview')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getOverview(@AuthJwtPayload('userId') userId: number) {
    return this.statisticService.getOverview(userId)
  }

  @Get('employer/application-funnel')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getApplication(
    @AuthJwtPayload('userId') userId: number,
    @Query('jobId') jobId?: number,
  ) {
    return this.statisticService.getApplication(userId, jobId)
  }

  @Get('employer/payments')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getPaymentStats(
    @AuthJwtPayload('userId') userId: number,
    @Query() query: PaymentStatsRequestDto,
  ) {
    return this.statisticService.getPaymentStats(userId, query)
  }
}
