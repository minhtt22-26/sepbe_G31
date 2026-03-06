import { Injectable } from '@nestjs/common'
import { Prisma } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchCompaies(
    where: Prisma.CompanyWhereInput,
    orderBy: Prisma.CompanyOrderByWithRelationInput,
    limit: number,
    offset: number,
  ) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          owner: {
            select: {
              fullName: true,
              avatar: true,
            },
          },
          _count: {
            select: { jobs: true },
          },
        },
      }),

      this.prisma.company.count({ where }),
    ])

    return { items, total }
  }
}
