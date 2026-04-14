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


