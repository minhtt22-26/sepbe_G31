import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import {
  SupportTicketChannel,
  SupportTicketPriority,
} from 'src/generated/prisma/enums'

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contact: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(SupportTicketChannel)
  channel?: SupportTicketChannel

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority
}
