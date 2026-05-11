import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { HelperService } from 'src/common/helper/service/helper.service'
import { ChatConversationRequestDto } from '../dtos/request/chat.create.request.dto'
import { ChatConversationBaseResponseDto } from '../dtos/response/chat.conversation-base.response.dto'
import { ChatRepository } from '../repositories/chat.repository'
import { UserRepository } from 'src/modules/users/repositories/user.repository'
import { ChatConversationResponseDto } from '../dtos/response/chat.conversation.response.dto'
import { ChatSendMessageRequestDto } from '../dtos/request/chat.send-message.request.dto'
import { ChatMessageResponseDto } from '../dtos/response/chat.message.response.dto'
import { ChatGetMessageRequestDto } from '../dtos/request/chat.get-message.request.dto'

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly userRepository: UserRepository,
    private readonly helperService: HelperService,
  ) {}

  async getOrCreateConversation(
    userId: number,
    dto: ChatConversationRequestDto,
  ): Promise<ChatConversationBaseResponseDto> {
    const { recipientId } = dto

    if (userId === recipientId) {
      throw new BadRequestException(
        'Bạn không thể bắt đầu cuộc trò chuyện với chính bạn',
      )
    }

    const recipient = await this.userRepository.findOneById(recipientId)
    if (!recipient) {
      throw new NotFoundException('Người dùng không tồn tại')
    }

    const { user1Id, user2Id } = this.helperService.getConversationUserIds(
      userId,
      recipientId,
    )

    const conversation = await this.chatRepository.findOrCreateConversation(
      user1Id,
      user2Id,
    )

    return {
      id: conversation.id,
      recipientId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }
  }

  async getUserConversations(
    userId: number,
  ): Promise<ChatConversationResponseDto[]> {
    const conversations = await this.chatRepository.getUserConversations(userId)

    return conversations.map((conv) => {
      const partner = conv.user1Id === userId ? conv.user2 : conv.user1
      const company = partner.companies[0]

      return {
        id: conv.id,
        partner: {
          id: partner.id,
          fullName: partner.fullName,
          avatar: partner.avatar ?? undefined,
          company: company
            ? {
                id: company.id,
                name: company.name,
                logoUrl: company.logoUrl ?? undefined,
              }
            : undefined,
        },
        lastMessage: conv.messages[0]
          ? {
              id: conv.messages[0].id,
              conversationId: conv.id,
              content: conv.messages[0].content,
              status: conv.messages[0].status,
              createdAt: conv.messages[0].createdAt,
              senderId: conv.messages[0].senderId,
            }
          : undefined,
        unreadCount: conv._count.messages,
        updatedAt: conv.updatedAt,
      }
    })
  }

  private async assertConversationAccess(
    conversationId: number,
    userId: number,
  ) {
    const conversation =
      await this.chatRepository.findConversationById(conversationId)

    if (!conversation)
      throw new NotFoundException('Cuộc trò chuyện không tồn tại')

    if (conversation.user1Id !== userId && conversation.user2Id !== userId)
      throw new ForbiddenException(
        'Bạn không có quyền truy cập cuộc trò chuyện này',
      )
    return conversation
  }

  async sendMessage(
    conversationId: number,
    userId: number,
    dto: ChatSendMessageRequestDto,
  ): Promise<ChatMessageResponseDto> {
    await this.assertConversationAccess(conversationId, userId)

    const message = await this.chatRepository.createMessage(
      conversationId,
      userId,
      dto.content,
    )

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      status: message.status,
      senderId: message.senderId,
      createdAt: message.createdAt,
    }
  }

  async getMessages(
    userId: number,
    conversationId: number,
    query: ChatGetMessageRequestDto,
  ): Promise<ChatMessageResponseDto[]> {
    const { limit = 20, cursor, search } = query
    const trimmedSearch = typeof search === 'string' ? search.trim() : ''

    await this.assertConversationAccess(conversationId, userId)

    const messages =
      trimmedSearch.length > 0
        ? await this.chatRepository.searchMessages(
            conversationId,
            trimmedSearch,
            limit,
          )
        : await this.chatRepository.getMessages(
            conversationId,
            limit,
            cursor,
          )

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      content: m.content,
      status: m.status,
      senderId: m.senderId,
      createdAt: m.createdAt,
    }))
  }

  async markAsRead(userId: number, conversationId: number): Promise<void> {
    await this.assertConversationAccess(conversationId, userId)

    await this.chatRepository.markMessagesAsRead(userId, conversationId)
  }
}
