import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import {
  ChatConversation,
  ChatMessage,
  MessageStatus,
} from 'src/generated/prisma/client'
import {
  ChatConversationWithDetails,
  IChatRepository,
} from '../interfaces/chat.repository.interface'

@Injectable()
export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConversationById(id: number): Promise<ChatConversation | null> {
    return await this.prisma.chatConversation.findUnique({
      where: { id },
    })
  }

  async findOrCreateConversation(
    user1Id: number,
    user2Id: number,
  ): Promise<ChatConversation> {
    return await this.prisma.chatConversation.upsert({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      update: {},
      create: { user1Id, user2Id },
    })
  }

  async getUserConversations(
    userId: number,
  ): Promise<ChatConversationWithDetails[]> {
    return await this.prisma.chatConversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            avatar: true,
            fullName: true,
            companies: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        user2: {
          select: {
            id: true,
            avatar: true,
            fullName: true,
            companies: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                status: { not: MessageStatus.READ },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async createMessage(
    conversationId: number,
    senderId: number,
    content: string,
  ): Promise<ChatMessage> {
    return await this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId,
          content,
        },
      })

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })

      return message
    })
  }

  async getMessages(
    conversationId: number,
    limit: number,
    cursor?: number,
  ): Promise<ChatMessage[]> {
    return await this.prisma.chatMessage.findMany({
      where: { conversationId },
      take: limit,
      ...(cursor !== undefined && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
    })
  }

  async markMessagesAsRead(
    userId: number,
    conversationId: number,
  ): Promise<void> {
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
      data: { status: MessageStatus.READ },
    })
  }
}
