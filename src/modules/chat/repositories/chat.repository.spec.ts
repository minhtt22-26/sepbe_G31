import { Test, TestingModule } from '@nestjs/testing'
import { ChatRepository } from './chat.repository'
import { PrismaService } from 'src/prisma.service'

const mockTx = {
  chatMessage: { create: jest.fn() },
  chatConversation: { update: jest.fn() },
}

const mockPrisma: any = {
  chatConversation: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('ChatRepository', () => {
  let repo: ChatRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx))
    mockTx.chatMessage.create.mockResolvedValue({ id: 10, content: 'Hello' })
    mockTx.chatConversation.update.mockResolvedValue({})
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    repo = module.get<ChatRepository>(ChatRepository)
  })

  it('findConversationById returns conversation', async () => {
    mockPrisma.chatConversation.findUnique.mockResolvedValue({ id: 1 })
    const result = await repo.findConversationById(1)
    expect(result).toEqual({ id: 1 })
  })

  it('findOrCreateConversation upserts conversation', async () => {
    mockPrisma.chatConversation.upsert.mockResolvedValue({ id: 1, user1Id: 2, user2Id: 3 })
    const result = await repo.findOrCreateConversation(2, 3)
    expect(result).toEqual({ id: 1, user1Id: 2, user2Id: 3 })
    expect(mockPrisma.chatConversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user1Id_user2Id: { user1Id: 2, user2Id: 3 } },
        create: { user1Id: 2, user2Id: 3 },
      }),
    )
  })

  it('getUserConversations returns user conversations', async () => {
    mockPrisma.chatConversation.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const result = await repo.getUserConversations(5)
    expect(mockPrisma.chatConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ user1Id: 5 }, { user2Id: 5 }] },
      }),
    )
    expect(result).toHaveLength(2)
  })

  it('createMessage creates message and updates conversation timestamp', async () => {
    const result = await repo.createMessage(1, 2, 'Hello')
    expect(mockTx.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { conversationId: 1, senderId: 2, content: 'Hello' } }),
    )
    expect(mockTx.chatConversation.update).toHaveBeenCalled()
    expect(result).toEqual({ id: 10, content: 'Hello' })
  })

  it('getMessages returns messages without cursor', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([{ id: 5 }, { id: 4 }])
    const result = await repo.getMessages(1, 20)
    expect(result).toHaveLength(2)
    const call = mockPrisma.chatMessage.findMany.mock.calls[0][0]
    expect(call.cursor).toBeUndefined()
  })

  it('getMessages uses cursor when provided', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([{ id: 3 }])
    await repo.getMessages(1, 10, 5)
    const call = mockPrisma.chatMessage.findMany.mock.calls[0][0]
    expect(call.cursor).toEqual({ id: 5 })
    expect(call.skip).toBe(1)
  })

  it('searchMessages returns empty when query is blank', async () => {
    const result = await repo.searchMessages(1, '  ', 10)
    expect(result).toEqual([])
    expect(mockPrisma.chatMessage.findMany).not.toHaveBeenCalled()
  })

  it('searchMessages returns results for valid query', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([{ id: 1, content: 'Hello world' }])
    const result = await repo.searchMessages(1, 'hello', 5)
    expect(result).toHaveLength(1)
  })

  it('markMessagesAsRead updates unread messages', async () => {
    mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 3 })
    await repo.markMessagesAsRead(2, 1)
    expect(mockPrisma.chatMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ conversationId: 1, senderId: { not: 2 } }),
      }),
    )
  })
})
