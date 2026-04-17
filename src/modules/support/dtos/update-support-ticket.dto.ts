import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { SupportTicketStatus } from 'src/generated/prisma/enums'

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assigneeName?: string

  @IsOptional()
  @IsString()
  internalNote?: string
}
