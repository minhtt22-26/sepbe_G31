import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { SupportService } from './support.service'
import { SupportRepository } from '../repositories/support.repository'
import { SupportTicketStatus } from 'src/generated/prisma/enums'

const repoMock = {
    findActiveManagers: jest.fn(),
    findByTicketCode: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
}

const mockManager = { id: 1, fullName: 'Manager A' }

describe('SupportService', () => {
    let service: SupportService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SupportService,
                { provide: SupportRepository, useValue: repoMock },
            ],
        }).compile()

        service = module.get<SupportService>(SupportService)
    })

    afterEach(() => jest.clearAllMocks())

    describe('createTicket', () => {
        it('[N] should create ticket with generated code', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager])
            repoMock.findByTicketCode.mockResolvedValue(null)
            const created = { id: 1, ticketCode: 'SP-20250101-1234', subject: 'Issue' }
            repoMock.create.mockResolvedValue(created)

            const dto = {
                customerName: 'John',
                contact: 'john@mail.com',
                subject: 'Issue',
                description: 'Desc',
                channel: 'EMAIL' as any,
                priority: 'HIGH' as any,
            }
            const result = await service.createTicket(dto)

            expect(result).toBe(created)
            expect(repoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerName: 'John',
                    assigneeName: 'Manager A',
                }),
            )
        })

        it('[A] should throw BadRequestException when no active manager', async () => {
            repoMock.findActiveManagers.mockResolvedValue([])

            await expect(
                service.createTicket({ customerName: 'A', contact: 'B', subject: 'C', description: 'D', channel: 'EMAIL' as any, priority: 'HIGH' as any }),
            ).rejects.toThrow(BadRequestException)
        })

        it('[A] should throw BadRequestException when more than 1 active manager', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager, { id: 2, fullName: 'Manager B' }])

            await expect(
                service.createTicket({ customerName: 'A', contact: 'B', subject: 'C', description: 'D', channel: 'EMAIL' as any, priority: 'HIGH' as any }),
            ).rejects.toThrow(BadRequestException)
        })
    })

    describe('listTickets', () => {
        it('[N] should return paginated tickets', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager])
            repoMock.list.mockResolvedValue({
                items: [{ id: 1 }, { id: 2 }],
                total: 2,
                summary: {},
            })

            const result = await service.listTickets({ page: 1, limit: 10 } as any)

            expect(result.items).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.totalPages).toBe(1)
        })

        it('[B] should use default pagination when page/limit not provided', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager])
            repoMock.list.mockResolvedValue({ items: [], total: 0, summary: {} })

            const result = await service.listTickets({} as any)

            expect(result.page).toBe(1)
            expect(result.limit).toBe(10)
        })

        it('[A] should throw when no manager', async () => {
            repoMock.findActiveManagers.mockResolvedValue([])

            await expect(service.listTickets({} as any)).rejects.toThrow(BadRequestException)
        })
    })

    describe('updateTicket', () => {
        it('[N] should update ticket status', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager])
            const existing = { id: 1, status: SupportTicketStatus.OPEN }
            repoMock.findById.mockResolvedValue(existing)
            const updated = { id: 1, status: SupportTicketStatus.RESOLVED }
            repoMock.update.mockResolvedValue(updated)

            const result = await service.updateTicket(1, { status: SupportTicketStatus.RESOLVED })

            expect(result).toBe(updated)
            expect(repoMock.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    status: SupportTicketStatus.RESOLVED,
                    resolvedAt: expect.any(Date),
                }),
            )
        })

        it('[N] should set resolvedAt to null for non-RESOLVED status', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager])
            repoMock.findById.mockResolvedValue({ id: 1, status: SupportTicketStatus.OPEN })
            repoMock.update.mockResolvedValue({ id: 1, status: SupportTicketStatus.IN_PROGRESS })

            await service.updateTicket(1, { status: SupportTicketStatus.IN_PROGRESS })

            expect(repoMock.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ resolvedAt: null }),
            )
        })

        it('[A] should throw NotFoundException when ticket not found', async () => {
            repoMock.findActiveManagers.mockResolvedValue([mockManager])
            repoMock.findById.mockResolvedValue(null)

            await expect(service.updateTicket(99, {})).rejects.toThrow(NotFoundException)
        })
    })
})
