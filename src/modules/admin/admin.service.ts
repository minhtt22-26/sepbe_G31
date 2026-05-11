import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EnumUserRole, OrderType } from 'src/generated/prisma/enums';
import { CreatePaymentPackageDto } from './dtos/create-payment-package.dto';
import { UpdatePaymentPackageDto } from './dtos/update-payment-package.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly POINT_SETTING_KEYS = [
    'JOB_POST_POINT_COST',
    'BOOST_JOB_POINT_COST',
    'BOOST_JOB_DURATION_DAYS',
    'AI_INVITE_POINT_COST_PER_WORKER',
  ] as const

  private validateDurationByOrderType(orderType: OrderType, durationDays?: number | null) {
    if (orderType === OrderType.BOOST_JOB && !durationDays) {
      throw new BadRequestException('Goi BOOST_JOB bat buoc co durationDays');
    }
  }

  private async validateUniqueBoostDuration(
    orderType: OrderType,
    durationDays?: number | null,
    ignoreId?: number,
  ) {
    if (orderType !== OrderType.BOOST_JOB || !durationDays) {
      return
    }

    const duplicated = await this.prisma.paymentPackage.findFirst({
      where: {
        orderType: OrderType.BOOST_JOB,
        durationDays,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    })

    if (duplicated) {
      throw new BadRequestException(
        `Da ton tai goi boost ${durationDays} ngay. Vui long chon so ngay khac.`,
      )
    }
  }

  async getPaymentPackages(params: {
    orderType?: OrderType;
    includeInactive?: boolean;
  }) {
    const packages = await this.prisma.paymentPackage.findMany({
      where: {
        ...(params.orderType ? { orderType: params.orderType } : {}),
        ...(params.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [
        { orderType: 'asc' },
        { durationDays: 'asc' },
        { price: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return { items: packages };
  }

  async getPointPricingSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: { in: [...this.POINT_SETTING_KEYS] },
      },
      orderBy: { key: 'asc' },
    })

    const map = new Map(settings.map((item) => [item.key, item]))
    return {
      items: this.POINT_SETTING_KEYS.map((key) => {
        const item = map.get(key)
        return {
          key,
          value: Number(item?.value ?? 0),
          description: item?.description || null,
        }
      }),
    }
  }

  async updatePointPricingSettings(payload: Record<string, number>) {
    const entries: Array<
      [(typeof this.POINT_SETTING_KEYS)[number], number]
    > = this.POINT_SETTING_KEYS.map((key) => [key, Number(payload[key] ?? 0)])
    for (const [key, value] of entries) {
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException(`Giá trị ${key} không hợp lệ`)
      }
      if (key === 'BOOST_JOB_DURATION_DAYS' && value < 1) {
        throw new BadRequestException('Thời gian boost phải lớn hơn hoặc bằng 1 ngày')
      }
    }

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(Math.floor(value)) },
          create: {
            key,
            value: String(Math.floor(value)),
          },
        }),
      ),
    )

    return this.getPointPricingSettings()
  }

  async createPaymentPackage(dto: CreatePaymentPackageDto) {
    this.validateDurationByOrderType(dto.orderType, dto.durationDays);
    await this.validateUniqueBoostDuration(dto.orderType, dto.durationDays);

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.paymentPackage.updateMany({
          where: { orderType: dto.orderType },
          data: { isDefault: false },
        });
      }

      return tx.paymentPackage.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          orderType: dto.orderType,
          durationDays:
            dto.orderType === OrderType.BOOST_JOB
              ? (dto.durationDays ?? null)
              : null,
          price: dto.price,
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
        },
      });
    });

    return {
      message: 'Tao goi thanh toan thanh cong',
      data: created,
    };
  }

  async updatePaymentPackage(id: number, dto: UpdatePaymentPackageDto) {
    const existing = await this.prisma.paymentPackage.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Khong tim thay goi thanh toan');
    }

    const nextOrderType = dto.orderType ?? existing.orderType;
    const nextDurationDays =
      dto.durationDays === undefined
        ? existing.durationDays
        : dto.durationDays;

    this.validateDurationByOrderType(nextOrderType, nextDurationDays);
    await this.validateUniqueBoostDuration(
      nextOrderType,
      nextDurationDays,
      id,
    )

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.paymentPackage.updateMany({
          where: { orderType: nextOrderType },
          data: { isDefault: false },
        });
      }

      return tx.paymentPackage.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          orderType: nextOrderType,
          durationDays:
            nextOrderType === OrderType.BOOST_JOB ? nextDurationDays : null,
          price: dto.price,
          isActive: dto.isActive,
          isDefault: dto.isDefault,
        },
      });
    });

    return {
      message: 'Cap nhat goi thanh toan thanh cong',
      data: updated,
    };
  }

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
