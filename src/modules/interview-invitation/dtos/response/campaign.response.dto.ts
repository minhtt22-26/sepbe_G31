import { ApiProperty } from '@nestjs/swagger'
import { CampaignStatus } from 'src/generated/prisma/enums'

export class CampaignResponseDto {
  @ApiProperty({ example: 1 })
  id: number

  @ApiProperty({ example: 'Mời phỏng vấn công nhân lắp ráp' })
  title: string

  @ApiProperty({ required: false })
  description?: string

  @ApiProperty({ example: 'Chúng tôi rất muốn mời bạn phỏng vấn...' })
  message: string

  @ApiProperty({ example: 1, required: false })
  jobId?: number

  @ApiProperty({ example: 50 })
  totalCount: number

  @ApiProperty({ example: 30 })
  acceptedCount: number

  @ApiProperty({ example: 10 })
  rejectedCount: number

  @ApiProperty({ example: 10 })
  pendingCount: number

  @ApiProperty({ enum: CampaignStatus, example: CampaignStatus.IN_PROGRESS })
  status: CampaignStatus

  @ApiProperty({ required: false })
  scheduledAt?: Date

  @ApiProperty({ required: false })
  sentAt?: Date

  @ApiProperty({ required: false })
  completedAt?: Date

  @ApiProperty({ required: false })
  expiresAt?: Date

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class PaginatedCampaignResponseDto {
  @ApiProperty({ type: [CampaignResponseDto] })
  data: CampaignResponseDto[]

  @ApiProperty({ example: 1 })
  page: number

  @ApiProperty({ example: 10 })
  limit: number

  @ApiProperty({ example: 100 })
  total: number
}
