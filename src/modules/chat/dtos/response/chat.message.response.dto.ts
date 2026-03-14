import { MessageStatus } from 'src/generated/prisma/enums'

export class ChatMessageResponseDto {
  id: number
  conversationId: number
  content: string
  status: MessageStatus
  senderId: number
  createdAt: Date
}
