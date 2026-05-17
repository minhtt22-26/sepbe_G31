import { Injectable, NotFoundException } from '@nestjs/common'
import { StatisticsRepository } from '../repositories/statistics.repository'
import { CompanyService } from 'src/modules/company/company.service'
import { PaymentStatsRequestDto } from '../dtos/request/payment-stats.request.dto'
import { DashboardStatsRequestDto } from '../dtos/request/dashboard-stats.request.dto'

@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly companyService: CompanyService,
  ) {}

  async getOverview(ownerId: number) {
    const company = await this.companyService.findByOwnerId(ownerId)
    if (!company) {
      throw new NotFoundException('Bạn chưa sở hữu công ty nào')
    }
    return this.statisticsRepository.getOverview(company.id)
  }
  async getDashboardStats(ownerId: number, query: DashboardStatsRequestDto) {
    const company = await this.companyService.findByOwnerId(ownerId)
    if (!company) {
      throw new NotFoundException('Bạn chưa sở hữu công ty nào')
    }
    return this.statisticsRepository.getDashboardStats(company.id, query)
  }

  async getJobFunnelStats(ownerId: number, jobId: number) {
    const company = await this.companyService.findByOwnerId(ownerId)
    if (!company) {
      throw new NotFoundException('Bạn chưa sở hữu công ty nào')
    }
    return this.statisticsRepository.getJobFunnelStats(company.id, jobId)
  }

  async getPaymentStats(ownerId: number, query: PaymentStatsRequestDto) {
    const company = await this.companyService.findByOwnerId(ownerId)
    if (!company) {
      throw new NotFoundException('Bạn chưa sở hữu công ty nào')
    }
    return this.statisticsRepository.getPaymentStats(ownerId, query)
  }

  async getJobStatus(ownerId: number) {
    const company = await this.companyService.findByOwnerId(ownerId)
    if (!company) {
      throw new NotFoundException('Bạn chưa sở hữu công ty nào')
    }
    return this.statisticsRepository.getJobStatus(company.id)
  }
}
