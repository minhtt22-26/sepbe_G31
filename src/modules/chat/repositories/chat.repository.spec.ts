import { Test, TestingModule } from '@nestjs/testing'
import { ChatRepository } from './chat.repository'
import { PrismaService } from 'src/prisma.service'

const mockPrisma: any = {
  chatConversation: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}

describe('ChatRepository', () => {
  let repo: ChatRepository

  beforeEach(async () => {
    jest.clearAllMocks()
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
})
