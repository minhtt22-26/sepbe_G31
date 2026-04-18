import { Type } from 'class-transformer'
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator'
import {
  SupportTicketChannel,
  SupportTicketPriority,
  SupportTicketStatus,
} from 'src/generated/prisma/enums'

export class SupportTicketListDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority

  @IsOptional()
  @IsEnum(SupportTicketChannel)
  channel?: SupportTicketChannel

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 10)
  }
}
