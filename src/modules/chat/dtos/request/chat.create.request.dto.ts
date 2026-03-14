import { IsInt, IsPositive } from 'class-validator'

export class ChatConversationRequestDto {
  @IsInt()
  @IsPositive()
  participantId: number
}
