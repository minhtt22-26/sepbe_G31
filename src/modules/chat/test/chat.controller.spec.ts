import { Test, TestingModule } from '@nestjs/testing'
import { ChatController } from '../controller/chat.controller'
import { ChatService } from '../service/chat.service'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ChatConversationRequestDto } from '../dtos/request/chat.create.request.dto'
import { ChatSendMessageRequestDto } from '../dtos/request/chat.send-message.request.dto'
import { ChatGetMessageRequestDto } from '../dtos/request/chat.get-message.request.dto'

describe('ChatController', () => {
  let controller: ChatController
  let service: ChatService

  const mockChatService = {
    getOrCreateConversation: jest.fn(),
    getUserConversations: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    markAsRead: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile()

    controller = module.get<ChatController>(ChatController)
    service = module.get<ChatService>(ChatService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateConversation', () => {
    const userId = 1
    const dto: ChatConversationRequestDto = { recipientId: 2 }

    it('[N] should successfully get or create a conversation', async () => {
      const expectedResult = {
        id: 10,
        recipientId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockChatService.getOrCreateConversation.mockResolvedValue(expectedResult)

      const result = await controller.getOrCreateConversation(userId, dto)
      expect(result).toEqual(expectedResult)
      expect(service.getOrCreateConversation).toHaveBeenCalledWith(userId, dto)
    })

    it('[B] should handle creation when recipientId is an extremely large number', async () => {
      const boundaryDto: ChatConversationRequestDto = { recipientId: 999999999 }
      const expectedResult = {
        id: 11,
        recipientId: boundaryDto.recipientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockChatService.getOrCreateConversation.mockResolvedValue(expectedResult)

      const result = await controller.getOrCreateConversation(
        userId,
        boundaryDto,
      )
      expect(result).toEqual(expectedResult)
    })

    it('[A] should throw BadRequestException if userId equals recipientId', async () => {
      mockChatService.getOrCreateConversation.mockRejectedValue(
        new BadRequestException(
          'Bạn không thể bắt đầu cuộc trò chuyện với chính bạn',
        ),
      )
      await expect(
        controller.getOrCreateConversation(userId, { recipientId: 1 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('[A] should throw NotFoundException if recipient does not exist', async () => {
      mockChatService.getOrCreateConversation.mockRejectedValue(
        new NotFoundException('Người dùng không tồn tại'),
      )
      await expect(
        controller.getOrCreateConversation(userId, dto),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUserConversations', () => {
    const userId = 1

    it('[N] should return a list of conversations for the user', async () => {
      const expectedResult = [
        { id: 1, partner: { id: 2, fullName: 'John Doe' }, unreadCount: 0 },
      ]
      mockChatService.getUserConversations.mockResolvedValue(expectedResult)

      const result = await controller.getUserConversations(userId)
      expect(result).toEqual(expectedResult)
      expect(service.getUserConversations).toHaveBeenCalledWith(userId)
    })

    it('[B] should return an empty array if user has no conversations', async () => {
      mockChatService.getUserConversations.mockResolvedValue([])
      const result = await controller.getUserConversations(userId)
      expect(result).toEqual([])
    })
  })

  describe('sendMessage', () => {
    const userId = 1
    const conversationId = 10
    const dto: ChatSendMessageRequestDto = { content: 'Hello' }

    it('[N] should successfully send a message', async () => {
      const expectedResult = {
        id: 100,
        conversationId,
        content: 'Hello',
        status: 'SENT',
        senderId: userId,
        createdAt: new Date(),
      }
      mockChatService.sendMessage.mockResolvedValue(expectedResult)

      const result = await controller.sendMessage(userId, conversationId, dto)
      expect(result).toEqual(expectedResult)
      expect(service.sendMessage).toHaveBeenCalledWith(
        conversationId,
        userId,
        dto,
      )
    })

    it('[B] should handle sending a message with a very long string', async () => {
      const longStringDto: ChatSendMessageRequestDto = {
        content: 'a'.repeat(5000),
      }
      const expectedResult = {
        id: 101,
        conversationId,
        content: longStringDto.content,
        status: 'SENT',
        senderId: userId,
        createdAt: new Date(),
      }
      mockChatService.sendMessage.mockResolvedValue(expectedResult)

      const result = await controller.sendMessage(
        userId,
        conversationId,
        longStringDto,
      )
      expect(result).toEqual(expectedResult)
    })

    it('[A] should throw NotFoundException if conversation does not exist', async () => {
      mockChatService.sendMessage.mockRejectedValue(
        new NotFoundException('Cuộc trò chuyện không tồn tại'),
      )
      await expect(
        controller.sendMessage(userId, conversationId, dto),
      ).rejects.toThrow(NotFoundException)
    })

    it('[A] should throw ForbiddenException if user is not part of the conversation', async () => {
      mockChatService.sendMessage.mockRejectedValue(
        new ForbiddenException(
          'Bạn không có quyền truy cập cuộc trò chuyện này',
        ),
      )
      await expect(
        controller.sendMessage(userId, conversationId, dto),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('getMessages', () => {
    const userId = 1
    const conversationId = 10
    const query: ChatGetMessageRequestDto = { limit: 20 }

    it('[N] should return messages for a conversation', async () => {
      const expectedResult = [
        { id: 100, content: 'Hello', senderId: 2, createdAt: new Date() },
      ]
      mockChatService.getMessages.mockResolvedValue(expectedResult)

      const result = await controller.getMessages(userId, conversationId, query)
      expect(result).toEqual(expectedResult)
      expect(service.getMessages).toHaveBeenCalledWith(
        userId,
        conversationId,
        query,
      )
    })

    it('[B] should handle query with empty search and limit undefined', async () => {
      const boundaryQuery: ChatGetMessageRequestDto = { search: '   ' }
      mockChatService.getMessages.mockResolvedValue([])

      const result = await controller.getMessages(
        userId,
        conversationId,
        boundaryQuery,
      )
      expect(result).toEqual([])
      expect(service.getMessages).toHaveBeenCalledWith(
        userId,
        conversationId,
        boundaryQuery,
      )
    })

    it('[A] should throw ForbiddenException if user tries to read messages of a conversation they are not in', async () => {
      mockChatService.getMessages.mockRejectedValue(
        new ForbiddenException(
          'Bạn không có quyền truy cập cuộc trò chuyện này',
        ),
      )
      await expect(
        controller.getMessages(userId, conversationId, query),
      ).rejects.toThrow(ForbiddenException)
    })

    it('[A] should throw NotFoundException if conversation does not exist', async () => {
      mockChatService.getMessages.mockRejectedValue(
        new NotFoundException('Cuộc trò chuyện không tồn tại'),
      )
      await expect(
        controller.getMessages(userId, conversationId, query),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('markAsRead', () => {
    const userId = 1
    const conversationId = 10

    it('[N] should mark conversation as read and return success: true', async () => {
      mockChatService.markAsRead.mockResolvedValue(undefined)

      const result = await controller.markAsRead(userId, conversationId)
      expect(result).toEqual({ success: true })
      expect(service.markAsRead).toHaveBeenCalledWith(userId, conversationId)
    })

    it('[B] should handle marking as read when there are no unread messages (should still return success: true)', async () => {
      mockChatService.markAsRead.mockResolvedValue(undefined)

      const result = await controller.markAsRead(userId, conversationId)
      expect(result).toEqual({ success: true })
    })

    it('[A] should throw NotFoundException if conversation does not exist', async () => {
      mockChatService.markAsRead.mockRejectedValue(
        new NotFoundException('Cuộc trò chuyện không tồn tại'),
      )
      await expect(
        controller.markAsRead(userId, conversationId),
      ).rejects.toThrow(NotFoundException)
    })

    it('[A] should throw ForbiddenException if user is not in the conversation', async () => {
      mockChatService.markAsRead.mockRejectedValue(
        new ForbiddenException(
          'Bạn không có quyền truy cập cuộc trò chuyện này',
        ),
      )
      await expect(
        controller.markAsRead(userId, conversationId),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
