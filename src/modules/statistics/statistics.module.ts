import { Module } from '@nestjs/common'
import { StatisticsController } from './controller/statistics.controller'
import { StatisticsService } from './service/statistics.service'
import { StatisticsRepository } from './repositories/statistics.repository'
import { CompanyModule } from '../company/company.module'

@Module({
  imports: [CompanyModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository],
  exports: [],
})
export class StatisticsModule {}
