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

  @Get('employer/job-engagement')
  @ApiOperation({
    summary: 'Thống kê lượt xem & ứng tuyển cho dashboard (Biểu đồ & Funnel tổng)',
  })
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getJobEngagementStatistic(
    @AuthJwtPayload('userId') userId: number,
    @Query() query: DashboardStatsRequestDto,
  ) {
    return this.statisticService.getJobEngagementStatistic(userId, query)
  }

  @Get('employer/jobs/:jobId/statistic')
  @ApiOperation({ summary: 'Thống kê chi tiết funnel ứng tuyển cho từng công việc' })
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getJobStatistic(
    @AuthJwtPayload('userId') userId: number,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.statisticService.getJobStatistic(userId, jobId)
  }

  @Get('employer/job-status')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  async getJobStatus(@AuthJwtPayload('userId') userId: number) {
    return this.statisticService.getJobStatus(userId)
  }
}
