import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'
import { StatisticsService } from '../service/statistics.service'
import { AuthJwtAccessGuard } from 'src/modules/auth/guards/jwt/auth.jwt.access.guards'
import {
  AuthJwtPayload,
  AuthRoleProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { PaymentStatsRequestDto } from '../dtos/request/payment-stats.request.dto'
import { DashboardStatsRequestDto } from '../dtos/request/dashboard-stats.request.dto'

@Controller('statistics')
@UseGuards(AuthJwtAccessGuard)
export class StatisticsController {
  constructor(private readonly statisticService: StatisticsService) {}

  @Get('employer/overview')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getOverview(@AuthJwtPayload('userId') userId: number) {
    return this.statisticService.getOverview(userId)
  }

  @Get('employer/dashboard-stats')
  @ApiOperation({
    summary: 'Thống kê tổng quát cho dashboard (Biểu đồ & Funnel tổng)',
  })
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getDashboardStats(
    @AuthJwtPayload('userId') userId: number,
    @Query() query: DashboardStatsRequestDto,
  ) {
    return this.statisticService.getDashboardStats(userId, query)
  }

  @Get('employer/jobs/:jobId/funnel')
  @ApiOperation({ summary: 'Thống kê chi tiết funnel cho từng công việc' })
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getJobFunnelStats(
    @AuthJwtPayload('userId') userId: number,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.statisticService.getJobFunnelStats(userId, jobId)
  }

  @Get('employer/payments')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getPaymentStats(
    @AuthJwtPayload('userId') userId: number,
    @Query() query: PaymentStatsRequestDto,
  ) {
    return this.statisticService.getPaymentStats(userId, query)
  }

  @Get('employer/job-status')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getJobStatus(@AuthJwtPayload('userId') userId: number) {
    return this.statisticService.getJobStatus(userId)
  }
}
