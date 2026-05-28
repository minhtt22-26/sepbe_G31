import { Test, TestingModule } from '@nestjs/testing'
import { SupportRepository } from './support.repository'
import { PrismaService } from 'src/prisma.service'
import { EnumUserRole, EnumUserStatus, SupportTicketStatus } from 'src/generated/prisma/enums'

const mockPrisma: any = {
  supportTicket: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  user: { findMany: jest.fn() },
}

describe('SupportRepository', () => {
  let repo: SupportRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    repo = module.get<SupportRepository>(SupportRepository)
  })

  it('create delegates to prisma', async () => {
    mockPrisma.supportTicket.create.mockResolvedValue({ id: 1 })
    const result = await repo.create({ ticketCode: 'SP-001' } as any)
    expect(result).toEqual({ id: 1 })
  })

  it('findById finds ticket by id', async () => {
    mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 5 })
    const result = await repo.findById(5)
    expect(result).toEqual({ id: 5 })
  })

  it('findByTicketCode finds ticket by code', async () => {
    mockPrisma.supportTicket.findUnique.mockResolvedValue({ ticketCode: 'SP-001' })
    await repo.findByTicketCode('SP-001')
    expect(mockPrisma.supportTicket.findUnique).toHaveBeenCalledWith({ where: { ticketCode: 'SP-001' } })
  })

  it('update updates ticket data', async () => {
    mockPrisma.supportTicket.update.mockResolvedValue({ id: 1, status: SupportTicketStatus.RESOLVED })
    await repo.update(1, { status: SupportTicketStatus.RESOLVED })
    expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: SupportTicketStatus.RESOLVED } })
  })

  it('findActiveManagers returns active managers', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 1, fullName: 'Manager' }])
    const result = await repo.findActiveManagers()
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: EnumUserRole.MANAGER, status: EnumUserStatus.ACTIVE },
      }),
    )
    expect(result).toHaveLength(1)
  })

  it('list returns tickets with pagination', async () => {
    mockPrisma.supportTicket.findMany.mockResolvedValue([{ id: 1 }])
    mockPrisma.supportTicket.count.mockResolvedValue(1)
    const result = await repo.list({ skip: 0, take: 10 })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('list filters by keyword when provided', async () => {
    mockPrisma.supportTicket.findMany.mockResolvedValue([])
    mockPrisma.supportTicket.count.mockResolvedValue(0)
    await repo.list({ skip: 0, take: 10, keyword: 'test', status: SupportTicketStatus.NEW })
    const call = mockPrisma.supportTicket.findMany.mock.calls[0][0]
    expect(call.where.OR).toBeDefined()
  })
})
