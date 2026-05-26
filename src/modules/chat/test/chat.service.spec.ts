import { Test, TestingModule } from '@nestjs/testing'
import { ChatService } from '../service/chat.service'
import { ChatRepository } from '../repositories/chat.repository'
import { UserRepository } from 'src/modules/users/repositories/user.repository'
import { HelperService } from 'src/common/helper/service/helper.service'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ChatConversationRequestDto } from '../dtos/request/chat.create.request.dto'
import { ChatSendMessageRequestDto } from '../dtos/request/chat.send-message.request.dto'
import { ChatGetMessageRequestDto } from '../dtos/request/chat.get-message.request.dto'

describe('ChatService', () => {
  let service: ChatService
  let chatRepository: Record<keyof ChatRepository, jest.Mock>
  let userRepository: Record<keyof UserRepository, jest.Mock>
  let helperService: Record<keyof HelperService, jest.Mock>

  beforeEach(async () => {
    chatRepository = {
      findOrCreateConversation: jest.fn(),
      getUserConversations: jest.fn(),
      findConversationById: jest.fn(),
      createMessage: jest.fn(),
      searchMessages: jest.fn(),
      getMessages: jest.fn(),
      markMessagesAsRead: jest.fn(),
    }

    userRepository = {
      findOneById: jest.fn(),
    } as any

    helperService = {
      getConversationUserIds: jest.fn(),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatRepository, useValue: chatRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: HelperService, useValue: helperService },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateConversation', () => {
    const userId = 1
    const dto: ChatConversationRequestDto = { recipientId: 2 }

    it('[N] should get or create a conversation successfully', async () => {
      userRepository.findOneById.mockResolvedValue({ id: 2 } as any)
      helperService.getConversationUserIds.mockReturnValue({
        user1Id: 1,
        user2Id: 2,
      })
      const mockConv = { id: 10, createdAt: new Date(), updatedAt: new Date() }
      chatRepository.findOrCreateConversation.mockResolvedValue(mockConv)

      const result = await service.getOrCreateConversation(userId, dto)

      expect(result).toEqual({
        id: mockConv.id,
        recipientId: 2,
        createdAt: mockConv.createdAt,
        updatedAt: mockConv.updatedAt,
      })
      expect(chatRepository.findOrCreateConversation).toHaveBeenCalledWith(1, 2)
    })

    it('[B] should handle creation for very large recipient ID', async () => {
      const boundaryDto = { recipientId: 99999999 }
      userRepository.findOneById.mockResolvedValue({
        id: boundaryDto.recipientId,
      } as any)
      helperService.getConversationUserIds.mockReturnValue({
        user1Id: 1,
        user2Id: boundaryDto.recipientId,
      })
      const mockConv = { id: 11, createdAt: new Date(), updatedAt: new Date() }
      chatRepository.findOrCreateConversation.mockResolvedValue(mockConv)

      const result = await service.getOrCreateConversation(userId, boundaryDto)
      expect(result.recipientId).toBe(boundaryDto.recipientId)
    })

    it('[A] should throw BadRequestException if userId equals recipientId', async () => {
      await expect(
        service.getOrCreateConversation(userId, { recipientId: userId }),
      ).rejects.toThrow(BadRequestException)
    })

    it('[A] should throw NotFoundException if recipient does not exist', async () => {
      userRepository.findOneById.mockResolvedValue(null)

      await expect(
        service.getOrCreateConversation(userId, dto),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUserConversations', () => {
    const userId = 1

    it('[N] should return mapped user conversations with last message and partner company', async () => {
      const mockConversations = [
        {
          id: 10,
          user1Id: 1,
          user2Id: 2,
          updatedAt: new Date(),
          user1: { id: 1 },
          user2: {
            id: 2,
            fullName: 'Jane Doe',
            avatar: 'url',
            companies: [{ id: 100, name: 'Company', logoUrl: 'logo' }],
          },
          messages: [
            {
              id: 1,
              content: 'Hi',
              status: 'SENT',
              createdAt: new Date(),
              senderId: 2,
            },
          ],
          _count: { messages: 5 },
        },
      ]
      chatRepository.getUserConversations.mockResolvedValue(mockConversations)

      const result = await service.getUserConversations(userId)

      expect(result).toHaveLength(1)
      expect(result[0].partner.fullName).toBe('Jane Doe')
      expect(result[0].partner.company?.name).toBe('Company')
      expect(result[0].lastMessage?.content).toBe('Hi')
      expect(result[0].unreadCount).toBe(5)
    })

    it('[N] should return mapped user conversations without last message or company', async () => {
      const mockConversations = [
        {
          id: 11,
          user1Id: 3, // Partner is user1 this time
          user2Id: 1,
          updatedAt: new Date(),
          user1: { id: 3, fullName: 'John', companies: [] },
          user2: { id: 1 },
          messages: [],
          _count: { messages: 0 },
        },
      ]
      chatRepository.getUserConversations.mockResolvedValue(mockConversations)

      const result = await service.getUserConversations(userId)

      expect(result[0].partner.fullName).toBe('John')
      expect(result[0].partner.company).toBeUndefined()
      expect(result[0].lastMessage).toBeUndefined()
      expect(result[0].unreadCount).toBe(0)
    })

    it('[B] should return empty array if no conversations found', async () => {
      chatRepository.getUserConversations.mockResolvedValue([])
      const result = await service.getUserConversations(userId)
      expect(result).toEqual([])
    })
  })

  describe('sendMessage', () => {
    const userId = 1
    const conversationId = 10
    const dto: ChatSendMessageRequestDto = { content: 'Hello' }

    it('[N] should send a message successfully', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 1,
        user2Id: 2,
      })
      const mockMsg = {
        id: 100,
        conversationId,
        content: 'Hello',
        status: 'SENT',
        senderId: userId,
        createdAt: new Date(),
      }
      chatRepository.createMessage.mockResolvedValue(mockMsg)

      const result = await service.sendMessage(conversationId, userId, dto)

      expect(result).toEqual(mockMsg)
      expect(chatRepository.createMessage).toHaveBeenCalledWith(
        conversationId,
        userId,
        dto.content,
      )
    })

    it('[B] should send a message with very long content', async () => {
      const longDto = { content: 'a'.repeat(5000) }
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 1,
        user2Id: 2,
      })
      chatRepository.createMessage.mockResolvedValue({
        id: 101,
        conversationId,
        content: longDto.content,
        status: 'SENT',
        senderId: userId,
        createdAt: new Date(),
      })

      const result = await service.sendMessage(conversationId, userId, longDto)
      expect(result.content).toBe(longDto.content)
    })

    it('[A] should throw NotFoundException if conversation not found', async () => {
      chatRepository.findConversationById.mockResolvedValue(null)
      await expect(
        service.sendMessage(conversationId, userId, dto),
      ).rejects.toThrow(NotFoundException)
    })

    it('[A] should throw ForbiddenException if user is not in the conversation', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 3,
        user2Id: 4,
      }) // User 1 is not in (3, 4)
      await expect(
        service.sendMessage(conversationId, userId, dto),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getMessages', () => {
    const userId = 1
    const conversationId = 10

    it('[N] should get messages without search query (calls getMessages)', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 1,
        user2Id: 2,
      })
      const mockMsg = {
        id: 1,
        conversationId,
        content: 'Hi',
        status: 'SENT',
        senderId: 2,
        createdAt: new Date(),
      }
      chatRepository.getMessages.mockResolvedValue([mockMsg])

      const query: ChatGetMessageRequestDto = { limit: 10, cursor: 5 }
      const result = await service.getMessages(userId, conversationId, query)

      expect(result).toHaveLength(1)
      expect(chatRepository.getMessages).toHaveBeenCalledWith(
        conversationId,
        10,
        5,
      )
      expect(chatRepository.searchMessages).not.toHaveBeenCalled()
    })

    it('[N] should search messages with search query (calls searchMessages)', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 1,
        user2Id: 2,
      })
      chatRepository.searchMessages.mockResolvedValue([])

      const query: ChatGetMessageRequestDto = { search: 'hello', limit: 20 }
      await service.getMessages(userId, conversationId, query)

      expect(chatRepository.searchMessages).toHaveBeenCalledWith(
        conversationId,
        'hello',
        20,
      )
      expect(chatRepository.getMessages).not.toHaveBeenCalled()
    })

    it('[A] should throw ForbiddenException if user is not in the conversation', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 3,
        user2Id: 4,
      })
      await expect(
        service.getMessages(userId, conversationId, {}),
      ).rejects.toThrow(ForbiddenException)
    })

    it('[A] should throw NotFoundException if conversation not found', async () => {
      chatRepository.findConversationById.mockResolvedValue(null)
      await expect(
        service.getMessages(userId, conversationId, {}),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('markAsRead', () => {
    const userId = 1
    const conversationId = 10

    it('[N] should mark messages as read successfully', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 1,
        user2Id: 2,
      })
      chatRepository.markMessagesAsRead.mockResolvedValue(undefined)

      await service.markAsRead(userId, conversationId)

      expect(chatRepository.markMessagesAsRead).toHaveBeenCalledWith(
        userId,
        conversationId,
      )
    })

    it('[B] should handle marking as read even if there are no unread messages', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 1,
        user2Id: 2,
      })
      chatRepository.markMessagesAsRead.mockResolvedValue(undefined)

      await expect(
        service.markAsRead(userId, conversationId),
      ).resolves.not.toThrow()
    })

    it('[A] should throw ForbiddenException if user is not in the conversation', async () => {
      chatRepository.findConversationById.mockResolvedValue({
        id: conversationId,
        user1Id: 3,
        user2Id: 4,
      })
      await expect(service.markAsRead(userId, conversationId)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('[A] should throw NotFoundException if conversation not found', async () => {
      chatRepository.findConversationById.mockResolvedValue(null)
      await expect(service.markAsRead(userId, conversationId)).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
