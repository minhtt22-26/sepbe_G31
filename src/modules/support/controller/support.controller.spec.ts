import { Test, TestingModule } from '@nestjs/testing'
import { SupportController } from './support.controller'
import { SupportService } from '../service/support.service'

const mockSupportService = {
  createTicket: jest.fn(),
  listTickets: jest.fn(),
  updateTicket: jest.fn(),
}

describe('SupportController', () => {
  let controller: SupportController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [{ provide: SupportService, useValue: mockSupportService }],
    }).compile()
    controller = module.get<SupportController>(SupportController)
  })

  it('createTicket delegates to service', async () => {
    const dto: any = { customerName: 'A', contact: '0900', subject: 'Test', channel: 'CHAT', priority: 'MEDIUM' }
    mockSupportService.createTicket.mockResolvedValue({ id: 1, ticketCode: 'SP-001' })
    const result = await controller.createTicket(dto)
    expect(mockSupportService.createTicket).toHaveBeenCalledWith(dto)
    expect(result.ticketCode).toBe('SP-001')
  })

  it('listTickets delegates to service', async () => {
    const query: any = { page: 1, limit: 10 }
    mockSupportService.listTickets.mockResolvedValue({ items: [], total: 0 })
    const result = await controller.listTickets(query)
    expect(mockSupportService.listTickets).toHaveBeenCalledWith(query)
    expect(result.total).toBe(0)
  })

  it('updateTicket delegates to service with id', async () => {
    const dto: any = { status: 'RESOLVED' }
    mockSupportService.updateTicket.mockResolvedValue({ id: 5 })
    await controller.updateTicket(5, dto)
    expect(mockSupportService.updateTicket).toHaveBeenCalledWith(5, dto)
  })
})
