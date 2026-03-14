import {
  ChatConversation,
  User,
  ChatMessage,
} from 'src/generated/prisma/client'

export type ChatConversationWithDetails = ChatConversation & {
  user1: Pick<User, 'id' | 'fullName' | 'avatar'> & {
    companies: { id: number; name: string; logoUrl: string | null }[]
  }
  user2: Pick<User, 'id' | 'fullName' | 'avatar'> & {
    companies: { id: number; name: string; logoUrl: string | null }[]
  }
  messages: ChatMessage[]
  _count: {
    messages: number
  }
}

export abstract class IChatRepository {
  abstract findConversationById(id: number): Promise<ChatConversation | null>

  abstract findOrCreateConversation(
    user1Id: number,
    user2Id: number,
  ): Promise<ChatConversation>

  abstract getUserConversations(
    userId: number,
  ): Promise<ChatConversationWithDetails[]>

  abstract createMessage(
    conversationId: number,
    senderId: number,
    content: string,
  ): Promise<ChatMessage>

  abstract getMessages(
    conversationId: number,
    limit: number,
    cursor?: number,
  ): Promise<ChatMessage[]>

  abstract markMessagesAsRead(
    userId: number,
    conversationId: number,
  ): Promise<void>
}
