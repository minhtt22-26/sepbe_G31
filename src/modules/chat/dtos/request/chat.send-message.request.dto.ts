import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class ChatSendMessageRequestDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string
}
