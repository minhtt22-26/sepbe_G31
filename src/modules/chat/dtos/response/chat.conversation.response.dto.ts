import { ChatMessageResponseDto } from './chat.message.response.dto'

export class ChatPartnerResponseDto {
  id: number
  fullName: string
  avatar?: string
  company?: {
    id: number
    name: string
    logoUrl?: string
  }
}

export class ChatConversationResponseDto {
  id: number
  partner: ChatPartnerResponseDto
  lastMessage?: ChatMessageResponseDto
  unreadCount: number
  updatedAt: Date
}
