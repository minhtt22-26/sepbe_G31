import 'reflect-metadata'
import { CampaignResponseDto, PaginatedCampaignResponseDto } from './campaign.response.dto'
import { CampaignStatus } from 'src/generated/prisma/enums'

describe('CampaignResponseDto', () => {
  it('can be instantiated with all properties', () => {
    const dto = new CampaignResponseDto()
    dto.id = 1
    dto.title = 'Dev Interview'
    dto.message = 'Come join us'
    dto.totalCount = 10
    dto.acceptedCount = 5
    dto.rejectedCount = 2
    dto.pendingCount = 3
    dto.status = CampaignStatus.IN_PROGRESS
    dto.createdAt = new Date()
    dto.updatedAt = new Date()
    expect(dto.id).toBe(1)
    expect(dto.status).toBe(CampaignStatus.IN_PROGRESS)
  })

  it('supports optional fields', () => {
    const dto = new CampaignResponseDto()
    dto.id = 2
    dto.title = 'Campaign'
    dto.message = 'Message'
    dto.totalCount = 0
    dto.acceptedCount = 0
    dto.rejectedCount = 0
    dto.pendingCount = 0
    dto.status = CampaignStatus.DRAFT
    dto.jobId = 5
    dto.description = 'Desc'
    dto.scheduledAt = new Date()
    dto.sentAt = new Date()
    dto.completedAt = new Date()
    dto.expiresAt = new Date()
    dto.createdAt = new Date()
    dto.updatedAt = new Date()
    expect(dto.jobId).toBe(5)
  })

  it('PaginatedCampaignResponseDto can be instantiated', () => {
    const dto = new PaginatedCampaignResponseDto()
    dto.data = []
    dto.page = 1
    dto.limit = 10
    dto.total = 0
    expect(dto.total).toBe(0)
  })
})
