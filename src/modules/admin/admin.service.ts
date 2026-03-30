import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EnumUserRole } from 'src/generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics(year?: number) {
    const targetYear = year || new Date().getFullYear();
    // 1. Users
    const totalUsers = await this.prisma.user.count();
    const workers = await this.prisma.user.count({ where: { role: EnumUserRole.WORKER } });
    const employers = await this.prisma.user.count({ where: { role: EnumUserRole.EMPLOYER } });

    // New users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers7Days = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    });

    // 2. Companies
    const totalCompanies = await this.prisma.company.count();
    const pendingCompanies = await this.prisma.company.count({ where: { status: 'PENDING' as any } });

    // 3. Jobs
    const totalJobs = await this.prisma.job.count();

    // Reports Unresolved
    const unresolvedReports = await this.prisma.jobReport.count({
      where: { status: 'PENDING' as any }
    });

    // 4. Payments
    const revenueAggr = await this.prisma.paymentOrder.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' as any }
    });
    const totalRevenue = revenueAggr._sum.amount || 0;

    // Time-series for Charts (12 Months of selected year)
    const labels: string[] = [];
    const revenue: number[] = [];
    const newUsers: number[] = [];
    
    for (let month = 0; month < 12; month++) {
      // Start of the month
      const startD = new Date(targetYear, month, 1);
      // Start of the next month
      const endD = new Date(targetYear, month + 1, 1);
      
      const monStr = `Tháng ${month + 1}`;
      labels.push(monStr);

      const usersCount = await this.prisma.user.count({
        where: { createdAt: { gte: startD, lt: endD } }
      });
      newUsers.push(usersCount);

      const revAggr = await this.prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: { 
          status: 'COMPLETED' as any,
          createdAt: { gte: startD, lt: endD }
        }
      });
      revenue.push(revAggr._sum.amount || 0);
    }

    return {
      users: { 
        total: totalUsers, 
        workers, 
        employers,
        newUsers7Days 
      },
      companies: { 
        total: totalCompanies, 
        pending: pendingCompanies 
      },
      jobs: { 
        total: totalJobs 
      },
      reports: {
        unresolved: unresolvedReports
      },
      payments: { 
        totalRevenue 
      },
      charts: {
        labels,
        revenue,
        newUsers
      }
    };
  }
}
