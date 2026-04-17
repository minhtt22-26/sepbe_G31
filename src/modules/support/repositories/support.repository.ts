import { Injectable } from '@nestjs/common'
import {
  Prisma,
  SupportTicketChannel,
  SupportTicketPriority,
  SupportTicketStatus,
} from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class SupportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SupportTicketCreateInput) {
    return this.prisma.supportTicket.create({ data })
  }

  async findById(id: number) {
    return this.prisma.supportTicket.findUnique({ where: { id } })
  }

  async findByTicketCode(ticketCode: string) {
    return this.prisma.supportTicket.findUnique({ where: { ticketCode } })
  }

  async update(id: number, data: Prisma.SupportTicketUpdateInput) {
    return this.prisma.supportTicket.update({
      where: { id },
      data,
    })
  }

  async list(params: {
    skip: number
    take: number
    keyword?: string
    status?: SupportTicketStatus
    priority?: SupportTicketPriority
    channel?: SupportTicketChannel
  }) {
    const { skip, take, keyword, status, priority, channel } = params

    const where: Prisma.SupportTicketWhereInput = {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(channel ? { channel } : {}),
      ...(keyword
        ? {
            OR: [
              { ticketCode: { contains: keyword, mode: 'insensitive' } },
              { customerName: { contains: keyword, mode: 'insensitive' } },
              { contact: { contains: keyword, mode: 'insensitive' } },
              { subject: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total, grouped] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
    ])

    const summary = {
      total,
      NEW: 0,
      IN_PROGRESS: 0,
      WAITING_CUSTOMER: 0,
      RESOLVED: 0,
    }

    for (const row of grouped) {
      summary[row.status] = row._count.status
    }

    return { items, total, summary }
  }
}
