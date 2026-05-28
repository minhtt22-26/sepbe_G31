import 'reflect-metadata'
import { InvitationResponseDto, PaginatedInvitationResponseDto, InvitationStatsResponseDto } from './invitation.response.dto'
import { InterviewInvitationStatus } from 'src/generated/prisma/enums'

describe('InvitationResponseDto', () => {
  it('can be instantiated with properties', () => {
    const dto = new InvitationResponseDto()
    dto.id = 1
    dto.status = InterviewInvitationStatus.PENDING
    dto.createdAt = new Date()
    dto.updatedAt = new Date()
    expect(dto.id).toBe(1)
  })

  it('PaginatedInvitationResponseDto can be instantiated', () => {
    const dto = new PaginatedInvitationResponseDto()
    dto.data = []
    dto.page = 1
    dto.limit = 10
    dto.total = 0
    expect(dto.total).toBe(0)
  })

  it('InvitationStatsResponseDto can be instantiated', () => {
    const dto = new InvitationStatsResponseDto()
    dto.totalInvitations = 10
    dto.acceptedCount = 5
    dto.rejectedCount = 2
    dto.pendingCount = 3
    dto.acceptanceRate = 50
    expect(dto.acceptanceRate).toBe(50)
  })
})
