import { Test, TestingModule } from '@nestjs/testing'
import { InterviewInvitationRepository } from './interview-invitation.repository'
import { PrismaService } from 'src/prisma.service'
import { InterviewInvitationStatus, CampaignStatus } from 'src/generated/prisma/enums'

const mockPrisma = {
  interviewInvitationCampaign: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  interviewInvitation: {
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
}

describe('InterviewInvitationRepository', () => {
  let repo: InterviewInvitationRepository

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewInvitationRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    repo = module.get<InterviewInvitationRepository>(InterviewInvitationRepository)
  })

  it('createCampaign delegates to prisma', async () => {
    mockPrisma.interviewInvitationCampaign.create.mockResolvedValue({ id: 1 })
    const result = await repo.createCampaign({ companyId: 1, title: 'Dev' })
    expect(result).toEqual({ id: 1 })
  })

  it('getCampaignById returns campaign with relations', async () => {
    mockPrisma.interviewInvitationCampaign.findUnique.mockResolvedValue({ id: 1 })
    const result = await repo.getCampaignById(1)
    expect(result).toEqual({ id: 1 })
  })

  it('getCampaignsByCompany returns paginated campaigns without status filter', async () => {
    mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([{ id: 1 }])
    mockPrisma.interviewInvitationCampaign.count.mockResolvedValue(1)
    const result = await repo.getCampaignsByCompany(1, 1, 10)
    expect(result.total).toBe(1)
    expect(result.campaigns).toHaveLength(1)
  })

  it('getCampaignsByCompany filters by status when provided', async () => {
    mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([])
    mockPrisma.interviewInvitationCampaign.count.mockResolvedValue(0)
    await repo.getCampaignsByCompany(1, 1, 10, CampaignStatus.IN_PROGRESS)
    const findManyCall = mockPrisma.interviewInvitationCampaign.findMany.mock.calls[0][0]
    expect(findManyCall.where.status).toBe(CampaignStatus.IN_PROGRESS)
  })

  it('bulkCreateInvitations creates with skipDuplicates', async () => {
    mockPrisma.interviewInvitation.createMany.mockResolvedValue({ count: 2 })
    const result = await repo.bulkCreateInvitations([{ workerId: 1 }, { workerId: 2 }])
    expect(result.count).toBe(2)
  })

  it('getInvitationById returns invitation with relations', async () => {
    mockPrisma.interviewInvitation.findUnique.mockResolvedValue({ id: 1 })
    const result = await repo.getInvitationById(1)
    expect(result).toEqual({ id: 1 })
  })

  it('getInvitationsByWorker returns all invitations without type filter', async () => {
    mockPrisma.interviewInvitation.findMany.mockResolvedValue([{ id: 1 }])
    mockPrisma.interviewInvitation.count.mockResolvedValue(1)
    const result = await repo.getInvitationsByWorker(2, 1, 10)
    expect(result.total).toBe(1)
  })

  it('getInvitationsByWorker filters by job type', async () => {
    mockPrisma.interviewInvitation.findMany.mockResolvedValue([])
    mockPrisma.interviewInvitation.count.mockResolvedValue(0)
    await repo.getInvitationsByWorker(2, 1, 10, 'job')
    const call = mockPrisma.interviewInvitation.findMany.mock.calls[0][0]
    expect(call.where.campaign).toEqual({ slots: { none: {} } })
  })

  it('getInvitationsByWorker filters by interview type', async () => {
    mockPrisma.interviewInvitation.findMany.mockResolvedValue([])
    mockPrisma.interviewInvitation.count.mockResolvedValue(0)
    await repo.getInvitationsByWorker(2, 1, 10, 'interview')
    const call = mockPrisma.interviewInvitation.findMany.mock.calls[0][0]
    expect(call.where.campaign).toEqual({ slots: { some: {} } })
  })

  it('updateInvitationStatus updates and returns invitation', async () => {
    mockPrisma.interviewInvitation.update.mockResolvedValue({ id: 1 })
    const result = await repo.updateInvitationStatus(1, InterviewInvitationStatus.ACCEPTED, 'ok', 2)
    expect(result).toEqual({ id: 1 })
  })

  it('getCampaignStats returns null when campaign not found', async () => {
    mockPrisma.interviewInvitationCampaign.findUnique.mockResolvedValue(null)
    const result = await repo.getCampaignStats(999)
    expect(result).toBeNull()
  })

  it('getCampaignStats calculates acceptance rate', async () => {
    mockPrisma.interviewInvitationCampaign.findUnique.mockResolvedValue({
      id: 1,
      totalCount: 4,
      invitations: [
        { status: InterviewInvitationStatus.ACCEPTED },
        { status: InterviewInvitationStatus.ACCEPTED },
        { status: InterviewInvitationStatus.REJECTED },
        { status: InterviewInvitationStatus.PENDING },
      ],
    })
    const result = await repo.getCampaignStats(1)
    expect(result?.acceptedCount).toBe(2)
    expect(result?.rejectedCount).toBe(1)
    expect(result?.pendingCount).toBe(1)
    expect(result?.acceptanceRate).toBe(50)
  })

  it('updateCampaignStatus sets sentAt when IN_PROGRESS', async () => {
    mockPrisma.interviewInvitationCampaign.update.mockResolvedValue({ id: 1 })
    await repo.updateCampaignStatus(1, CampaignStatus.IN_PROGRESS)
    const call = mockPrisma.interviewInvitationCampaign.update.mock.calls[0][0]
    expect(call.data.sentAt).toBeInstanceOf(Date)
  })

  it('updateCampaignStatus sets completedAt when COMPLETED', async () => {
    mockPrisma.interviewInvitationCampaign.update.mockResolvedValue({ id: 1 })
    await repo.updateCampaignStatus(1, CampaignStatus.COMPLETED)
    const call = mockPrisma.interviewInvitationCampaign.update.mock.calls[0][0]
    expect(call.data.completedAt).toBeInstanceOf(Date)
  })
})
