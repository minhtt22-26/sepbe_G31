import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { SupportTicketStatus } from 'src/generated/prisma/enums'
import { CreateSupportTicketDto } from '../dtos/create-support-ticket.dto'
import { SupportTicketListDto } from '../dtos/support-ticket-list.dto'
import { UpdateSupportTicketDto } from '../dtos/update-support-ticket.dto'
import { SupportRepository } from '../repositories/support.repository'

@Injectable()
export class SupportService {
  constructor(private readonly supportRepository: SupportRepository) {}

  private async getSingleActiveManager() {
    const managers = await this.supportRepository.findActiveManagers()

    if (managers.length === 0) {
      throw new BadRequestException({
        message:
          'Không thể xử lý ticket vì chưa có manager đang hoạt động trong hệ thống',
      })
    }

    if (managers.length > 1) {
      throw new BadRequestException({
        message:
          'Không thể xử lý ticket vì hệ thống đang có nhiều hơn 1 manager đang hoạt động',
      })
    }

    return managers[0]
  }

  private async generateTicketCode() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const now = new Date()
      const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const suffix = Math.floor(Math.random() * 9000) + 1000
      const code = `SP-${date}-${suffix}`
      const existed = await this.supportRepository.findByTicketCode(code)
      if (!existed) return code
    }
    throw new Error('Cannot generate support ticket code')
  }

  async createTicket(dto: CreateSupportTicketDto) {
    const manager = await this.getSingleActiveManager()
    const ticketCode = await this.generateTicketCode()
    return this.supportRepository.create({
      ticketCode,
      customerName: dto.customerName,
      contact: dto.contact,
      subject: dto.subject,
      description: dto.description,
      channel: dto.channel,
      priority: dto.priority,
      assigneeName: manager.fullName,
    })
  }

  async listTickets(query: SupportTicketListDto) {
    await this.getSingleActiveManager()

    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const result = await this.supportRepository.list({
      skip: query.skip,
      take: limit,
      keyword: query.keyword,
      status: query.status,
      priority: query.priority,
      channel: query.channel,
    })

    return {
      items: result.items,
      page,
      limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
      summary: result.summary,
    }
  }

  async updateTicket(id: number, dto: UpdateSupportTicketDto) {
    const manager = await this.getSingleActiveManager()
    const existing = await this.supportRepository.findById(id)
    if (!existing) {
      throw new NotFoundException(`Support ticket ${id} not found`)
    }

    const nextStatus = dto.status ?? existing.status
    const resolvedAt =
      nextStatus === SupportTicketStatus.RESOLVED ? new Date() : null

    return this.supportRepository.update(id, {
      ...(dto.status ? { status: dto.status } : {}),
      assigneeName: manager.fullName,
      ...(dto.internalNote !== undefined
        ? { internalNote: dto.internalNote || null }
        : {}),
      resolvedAt,
    })
  }
}
