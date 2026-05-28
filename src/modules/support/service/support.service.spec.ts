import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { SupportService } from './support.service'
import { SupportRepository } from '../repositories/support.repository'
import { SupportTicketStatus } from 'src/generated/prisma/enums'

const mockRepo = {
  findActiveManagers: jest.fn(),
  findByTicketCode: jest.fn(),
  create: jest.fn(),
  list: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
}

const manager = { id: 1, fullName: 'Manager A' }
const ticket = { id: 10, ticketCode: 'SP-20250101-1234', status: SupportTicketStatus.NEW }

describe('SupportService', () => {
  let service: SupportService

  beforeEach(async () => {
    jest.clearAllMocks()

    mockRepo.findActiveManagers.mockResolvedValue([manager])
    mockRepo.findByTicketCode.mockResolvedValue(null) // code not taken
    mockRepo.create.mockResolvedValue(ticket)
    mockRepo.findById.mockResolvedValue(ticket)
    mockRepo.update.mockResolvedValue({ ...ticket, status: SupportTicketStatus.RESOLVED })
    mockRepo.list.mockResolvedValue({ items: [ticket], total: 1, summary: {} })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: SupportRepository, useValue: mockRepo },
      ],
    }).compile()

    service = module.get<SupportService>(SupportService)
  })

  // ── createTicket ──────────────────────────────────────────────────────────

  describe('createTicket', () => {
    const dto: any = {
      customerName: 'Nguyen Van A',
      contact: '0900000000',
      subject: 'Test issue',
      description: 'Some description',
      channel: 'CHAT' as any,
      priority: 'MEDIUM' as any,
    }

    it('creates a ticket and assigns manager', async () => {
      const result = await service.createTicket(dto)
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeName: 'Manager A' }),
      )
      expect(result).toBe(ticket)
    })

    it('throws when no active manager exists', async () => {
      mockRepo.findActiveManagers.mockResolvedValue([])
      await expect(service.createTicket(dto)).rejects.toThrow(BadRequestException)
    })

    it('throws when more than one active manager exists', async () => {
      mockRepo.findActiveManagers.mockResolvedValue([manager, { id: 2, fullName: 'Manager B' }])
      await expect(service.createTicket(dto)).rejects.toThrow(BadRequestException)
    })

    it('retries ticket code generation on collision', async () => {
      mockRepo.findByTicketCode
        .mockResolvedValueOnce({ id: 99 }) // first code taken
        .mockResolvedValue(null)            // second code free
      await service.createTicket(dto)
      expect(mockRepo.findByTicketCode).toHaveBeenCalledTimes(2)
    })
  })

  // ── listTickets ───────────────────────────────────────────────────────────

  describe('listTickets', () => {
    it('returns paginated ticket list', async () => {
      const result = await service.listTickets({ page: 1, limit: 10 } as any)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('calculates totalPages correctly', async () => {
      mockRepo.list.mockResolvedValue({ items: [], total: 25, summary: {} })
      const result = await service.listTickets({ page: 1, limit: 10 } as any)
      expect(result.totalPages).toBe(3)
    })
  })

  // ── updateTicket ──────────────────────────────────────────────────────────

  describe('updateTicket', () => {
    it('updates ticket successfully', async () => {
      const result = await service.updateTicket(10, { status: SupportTicketStatus.RESOLVED })
      expect(mockRepo.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ status: SupportTicketStatus.RESOLVED }),
      )
      expect(result).toBeDefined()
    })

    it('throws NotFoundException when ticket not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.updateTicket(999, {})).rejects.toThrow(NotFoundException)
    })

    it('sets resolvedAt when status becomes RESOLVED', async () => {
      await service.updateTicket(10, { status: SupportTicketStatus.RESOLVED })
      const updateCall = mockRepo.update.mock.calls[0][1]
      expect(updateCall.resolvedAt).toBeInstanceOf(Date)
    })

    it('sets resolvedAt to null when status is not RESOLVED', async () => {
      await service.updateTicket(10, { status: SupportTicketStatus.IN_PROGRESS })
      const updateCall = mockRepo.update.mock.calls[0][1]
      expect(updateCall.resolvedAt).toBeNull()
    })
  })
})
