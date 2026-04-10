import { ApiProperty } from '@nestjs/swagger'
import { InterviewInvitationStatus } from 'src/generated/prisma/enums'

class CompanyInfoDto {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ example: 'Công ty ABC' })
  name: string

  @ApiProperty({ required: false })
  logoUrl?: string
}

class CampaignInfoDto {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ example: 'Mời phỏng vấn công nhân lắp ráp' })
  title: string

  @ApiProperty({ example: 'Nội dung tin nhắn...' })
  message: string
}

export class InvitationResponseDto {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ type: CampaignInfoDto })
  campaign: CampaignInfoDto

  @ApiProperty({ type: CompanyInfoDto })
  company: CompanyInfoDto

  @ApiProperty({ enum: InterviewInvitationStatus, example: InterviewInvitationStatus.PENDING })
  status: InterviewInvitationStatus

  @ApiProperty({ required: false })
  responseMessage?: string

  @ApiProperty({ required: false })
  respondedAt?: Date

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class PaginatedInvitationResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  data: InvitationResponseDto[]

  @ApiProperty({ example: 1 })
  page: number

  @ApiProperty({ example: 10 })
  limit: number

  @ApiProperty({ example: 100 })
  total: number
}

export class InvitationStatsResponseDto {
  @ApiProperty({ example: 50 })
  totalInvitations: number

  @ApiProperty({ example: 30 })
  acceptedCount: number

  @ApiProperty({ example: 10 })
  rejectedCount: number

  @ApiProperty({ example: 10 })
  pendingCount: number

  @ApiProperty({ example: 60 })
  acceptanceRate: number // Phần trăm
}
