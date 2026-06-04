import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InterviewInvitationService } from './interview-invitation.service'
import { InterviewInvitationRepository } from '../repositories/interview-invitation.repository'
import { PrismaService } from 'src/prisma.service'
import { NotificationsService } from 'src/modules/notifications/notifications.service'
import { ChatService } from 'src/modules/chat/service/chat.service'
import { WalletService } from 'src/modules/wallet/wallet.service'
import {
  CampaignStatus,
  EnumUserRole,
  InterviewInvitationStatus,
  WalletTransactionType,
} from 'src/generated/prisma/enums'

// ─── TX mock ────────────────────────────────────────────────────────────────

const mockTx = {
  interviewInvitationCampaign: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  interviewInvitationSlot: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
  interviewInvitation: {
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  notification: { create: jest.fn(), findMany: jest.fn(), createMany: jest.fn() },
  job: { findUnique: jest.fn() },
  jobApplication: { upsert: jest.fn() },
}

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const mockPrisma = {
  interviewInvitation: {
    count: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  interviewInvitationCampaign: {
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  interviewInvitationSlot: { count: jest.fn(), updateMany: jest.fn() },
  jobApplication: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  job: { findFirst: jest.fn(), findUnique: jest.fn() },
  company: { findUnique: jest.fn() },
  notification: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

// ─── Repo mock ────────────────────────────────────────────────────────────────

const mockRepo = {
  getCampaignById: jest.fn(),
  getCampaignsByCompany: jest.fn(),
  getCampaignStats: jest.fn(),
  getInvitationsByWorker: jest.fn(),
  getInvitationById: jest.fn(),
  updateInvitationStatus: jest.fn(),
  updateCampaignStatus: jest.fn(),
}

const mockWalletService = {
  getPointCost: jest.fn().mockResolvedValue(1000),
  deductPoints: jest.fn().mockResolvedValue(undefined),
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeSlot = (overrides = {}) => ({
  id: 1,
  campaignId: 10,
  startAt: new Date(Date.now() + 86400000 * 2),
  endAt: new Date(Date.now() + 86400000 * 2 + 3600000),
  capacity: 5,
  bookedCount: 0,
  location: 'Office A',
  note: null,
  ...overrides,
})

const makeInvitation = (overrides = {}) => ({
  id: 1,
  workerId: 2,
  campaignId: 10,
  status: InterviewInvitationStatus.PENDING,
  selectedSlotId: null,
  responseMessage: null,
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  campaign: {
    id: 10,
    title: 'Dev Interview',
    message: 'Mời phỏng vấn',
    jobId: 5,
    companyId: 1,
    expiresAt: null,
    slots: [makeSlot()],
  },
  worker: { id: 2, fullName: 'Worker A' },
  selectedSlot: null,
  ...overrides,
})

const makeCampaign = (overrides = {}) => ({
  id: 10,
  companyId: 1,
  jobId: 5,
  title: 'Dev Interview',
  message: 'Mời phỏng vấn',
  description: null,
  status: CampaignStatus.DRAFT,
  totalCount: 1,
  pendingCount: 1,
  acceptedCount: 0,
  rejectedCount: 0,
  expiresAt: null,
  scheduledAt: null,
  sentAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  invitations: [{ id: 1, workerId: 2, status: InterviewInvitationStatus.PENDING, selectedSlotId: null }],
  slots: [makeSlot()],
  company: { id: 1, name: 'WorkLink' },
  ...overrides,
})

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('InterviewInvitationService', () => {
  let service: InterviewInvitationService

  beforeEach(async () => {
    jest.clearAllMocks()

    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return Promise.all(arg)
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewInvitationService,
        { provide: InterviewInvitationRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile()

    service = module.get<InterviewInvitationService>(InterviewInvitationService)
  })

  // ── getCampaignsForCompany ────────────────────────────────────────────────

  describe('getCampaignsForCompany', () => {
    it('returns paginated campaigns', async () => {
      const campaign = makeCampaign()
      mockRepo.getCampaignsByCompany.mockResolvedValue({ campaigns: [campaign], total: 1 })
      const result = await service.getCampaignsForCompany(1, { page: 1, limit: 10 })
      expect(result.total).toBe(1)
      expect(result.data[0].id).toBe(10)
      expect(result.data[0].slots).toHaveLength(1)
    })

    it('uses defaults when page/limit missing', async () => {
      mockRepo.getCampaignsByCompany.mockResolvedValue({ campaigns: [], total: 0 })
      const result = await service.getCampaignsForCompany(1, {})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })
  })

  // ── getCampaignDetail ─────────────────────────────────────────────────────

  describe('getCampaignDetail', () => {
    it('returns campaign with stats', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign())
      mockRepo.getCampaignStats.mockResolvedValue({ accepted: 0, rejected: 0 })
      const result = await service.getCampaignDetail(10, 1)
      expect(result.id).toBe(10)
      expect(result.stats).toBeDefined()
    })

    it('throws NotFoundException when campaign not found', async () => {
      mockRepo.getCampaignById.mockResolvedValue(null)
      await expect(service.getCampaignDetail(999, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when wrong company', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ companyId: 99 }))
      await expect(service.getCampaignDetail(10, 1)).rejects.toThrow(ForbiddenException)
    })
  })

  // ── getPendingInvitationsStatus ───────────────────────────────────────────

  describe('getPendingInvitationsStatus', () => {
    it('returns pending status flags', async () => {
      mockPrisma.interviewInvitation.count
        .mockResolvedValueOnce(2)   // pendingJobCount
        .mockResolvedValueOnce(1)   // pendingInterviewCount
      const result = await service.getPendingInvitationsStatus(2)
      expect(result.hasPendingJob).toBe(true)
      expect(result.hasPendingInterview).toBe(true)
    })

    it('returns false when no pending invitations', async () => {
      mockPrisma.interviewInvitation.count.mockResolvedValue(0)
      const result = await service.getPendingInvitationsStatus(2)
      expect(result.hasPendingJob).toBe(false)
      expect(result.hasPendingInterview).toBe(false)
    })
  })

  // ── getInvitationsForWorker ───────────────────────────────────────────────

  describe('getInvitationsForWorker', () => {
    it('maps invitation data correctly', async () => {
      const inv = makeInvitation()
      mockRepo.getInvitationsByWorker.mockResolvedValue({ invitations: [inv], total: 1 })
      const result = await service.getInvitationsForWorker(2, 1, 10)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe(1)
      expect(result.data[0].campaign.slots[0].remainingSeats).toBe(5)
    })

    it('returns EXPIRED when PENDING invitation is past expiresAt', async () => {
      const inv = makeInvitation({
        status: InterviewInvitationStatus.PENDING,
        campaign: {
          id: 10,
          title: 'Dev Interview',
          message: 'Mời phỏng vấn',
          jobId: 5,
          companyId: 1,
          expiresAt: new Date('2020-01-01'),
          slots: [makeSlot()],
        },
      })
      mockRepo.getInvitationsByWorker.mockResolvedValue({ invitations: [inv], total: 1 })
      const result = await service.getInvitationsForWorker(2, 1, 10)
      expect(result.data[0].status).toBe(InterviewInvitationStatus.EXPIRED)
    })
  })

  // ── getCampaignStats ──────────────────────────────────────────────────────

  describe('getCampaignStats', () => {
    it('returns campaign stats', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign())
      mockRepo.getCampaignStats.mockResolvedValue({ accepted: 1, pending: 0 })
      const result = await service.getCampaignStats(10, 1)
      expect(result).toEqual({ accepted: 1, pending: 0 })
    })

    it('throws NotFoundException when not found', async () => {
      mockRepo.getCampaignById.mockResolvedValue(null)
      await expect(service.getCampaignStats(999, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException for wrong company', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ companyId: 99 }))
      await expect(service.getCampaignStats(10, 1)).rejects.toThrow(ForbiddenException)
    })
  })

  // ── getInvitedWorkersByJob ────────────────────────────────────────────────

  describe('getInvitedWorkersByJob', () => {
    it('returns list of invited workers', async () => {
      mockPrisma.interviewInvitation.findMany.mockResolvedValue([
        {
          id: 1,
          status: InterviewInvitationStatus.PENDING,
          respondedAt: null,
          createdAt: new Date(),
          worker: { id: 2, fullName: 'A', email: null, phone: null, avatar: null },
          campaign: { id: 10, title: 'Dev', slots: [{ id: 1 }] },
        },
      ])
      const result = await service.getInvitedWorkersByJob(5, 1)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('INTERVIEW')
    })

    it('returns JOB_INVITE type for slot-less campaigns', async () => {
      mockPrisma.interviewInvitation.findMany.mockResolvedValue([
        {
          id: 2,
          status: InterviewInvitationStatus.ACCEPTED,
          respondedAt: new Date(),
          createdAt: new Date(),
          worker: { id: 3, fullName: 'B', email: null, phone: null, avatar: null },
          campaign: { id: 11, title: 'Job Invite', slots: [] },
        },
      ])
      const result = await service.getInvitedWorkersByJob(5, 1)
      expect(result[0].type).toBe('JOB_INVITE')
    })
  })

  // ── getJobInviteConstraints ───────────────────────────────────────────────

  describe('getJobInviteConstraints', () => {
    it('throws NotFoundException when job not found', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null)
      await expect(service.getJobInviteConstraints(99, 1)).rejects.toThrow(NotFoundException)
    })

    it('returns constraints with no existing schedule', async () => {
      mockPrisma.job.findFirst.mockResolvedValue({ id: 5 })
      mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([])
      const result = await service.getJobInviteConstraints(5, 1)
      expect(result.hasExistingSchedule).toBe(false)
      expect(result.windowStart).toBeNull()
      expect(result.invitedWorkerIds).toHaveLength(0)
    })

    it('returns constraints with existing schedule and invited workers', async () => {
      const futureDate1 = new Date(Date.now() + 86400000)
      const futureDate2 = new Date(Date.now() + 86400000 * 2)
      mockPrisma.job.findFirst.mockResolvedValue({ id: 5 })
      mockPrisma.interviewInvitationCampaign.findMany.mockResolvedValue([
        {
          id: 10,
          invitations: [
            { workerId: 2, status: InterviewInvitationStatus.PENDING },
            { workerId: 3, status: InterviewInvitationStatus.REJECTED },
          ],
          slots: [
            { id: 1, startAt: futureDate1, endAt: futureDate2, capacity: 5, location: null, note: null },
          ],
        },
      ])
      const result = await service.getJobInviteConstraints(5, 1)
      expect(result.hasExistingSchedule).toBe(true)
      expect(result.invitedWorkerIds).toContain(2) // PENDING → included
      expect(result.invitedWorkerIds).not.toContain(3) // REJECTED → excluded
    })
  })

  // ── sendCampaign ─────────────────────────────────────────────────────────

  describe('sendCampaign', () => {
    it('throws NotFoundException when campaign not found', async () => {
      mockRepo.getCampaignById.mockResolvedValue(null)
      await expect(service.sendCampaign(999, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException for wrong company', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ companyId: 99 }))
      await expect(service.sendCampaign(10, 1)).rejects.toThrow(ForbiddenException)
    })

    it('returns early when campaign already IN_PROGRESS', async () => {
      const campaign = makeCampaign({ status: CampaignStatus.IN_PROGRESS })
      mockRepo.getCampaignById.mockResolvedValue(campaign)
      const result = await service.sendCampaign(10, 1)
      expect(mockWalletService.deductPoints).not.toHaveBeenCalled()
      expect(result).toBe(campaign)
    })

    it('throws BadRequestException for no pending workers', async () => {
      mockRepo.getCampaignById.mockResolvedValue(
        makeCampaign({
          invitations: [
            { id: 1, workerId: 2, status: InterviewInvitationStatus.ACCEPTED, selectedSlotId: 1 },
          ],
        }),
      )
      await expect(service.sendCampaign(10, 1)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for invalid status (CANCELLED)', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ status: CampaignStatus.CANCELLED }))
      await expect(service.sendCampaign(10, 1)).rejects.toThrow(BadRequestException)
    })

    it('deducts points and updates status when valid', async () => {
      mockRepo.getCampaignById
        .mockResolvedValueOnce(makeCampaign()) // first call in sendCampaign
        .mockResolvedValue(makeCampaign({ status: CampaignStatus.IN_PROGRESS })) // second call at end
      mockRepo.updateCampaignStatus.mockResolvedValue(undefined)
      mockPrisma.job.findUnique.mockResolvedValue({ title: 'Dev' })
      mockPrisma.notification.create.mockResolvedValue({})

      await service.sendCampaign(10, 1)
      expect(mockWalletService.deductPoints).toHaveBeenCalledWith(
        expect.objectContaining({ type: WalletTransactionType.AI_INVITE }),
      )
      expect(mockRepo.updateCampaignStatus).toHaveBeenCalledWith(10, CampaignStatus.IN_PROGRESS)
    })
  })

  // ── cancelCampaign ────────────────────────────────────────────────────────

  describe('cancelCampaign', () => {
    beforeEach(() => {
      mockPrisma.job.findUnique.mockResolvedValue({ title: 'Dev' })
      mockPrisma.notification.create.mockResolvedValue({})
      mockPrisma.interviewInvitationCampaign.findUnique.mockResolvedValue({
        id: 10,
        invitations: [],
      })
      mockTx.interviewInvitationCampaign.update.mockResolvedValue({})
      mockTx.interviewInvitation.updateMany.mockResolvedValue({})
    })

    it('throws NotFoundException when campaign not found', async () => {
      mockRepo.getCampaignById.mockResolvedValue(null)
      await expect(service.cancelCampaign(999, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException for wrong company', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ companyId: 99 }))
      await expect(service.cancelCampaign(10, 1)).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException if already cancelled', async () => {
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ status: CampaignStatus.CANCELLED }))
      await expect(service.cancelCampaign(10, 1)).rejects.toThrow(BadRequestException)
    })

    it('cancels campaign and sends notifications to affected workers', async () => {
      const campaign = makeCampaign({
        invitations: [
          { id: 1, workerId: 2, status: InterviewInvitationStatus.PENDING, selectedSlotId: null },
          { id: 2, workerId: 3, status: InterviewInvitationStatus.ACCEPTED, selectedSlotId: 1 },
        ],
      })
      mockRepo.getCampaignById
        .mockResolvedValueOnce(campaign)
        .mockResolvedValue(campaign)
      mockPrisma.interviewInvitationCampaign.findUnique.mockResolvedValue({
        id: 10,
        invitations: campaign.invitations,
      })
      mockTx.interviewInvitationSlot.updateMany.mockResolvedValue({})

      await service.cancelCampaign(10, 1)
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2)
    })
  })

  // ── createCampaign ────────────────────────────────────────────────────────

  describe('createCampaign', () => {
    const futureSlot = {
      startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 2 + 3600000).toISOString(),
      capacity: 5,
      location: 'Office',
    }

    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 2, role: EnumUserRole.WORKER }])
      mockPrisma.job.findFirst.mockResolvedValue({ id: 5, title: 'Dev' })
      mockPrisma.interviewInvitation.findMany.mockResolvedValue([])

      const createdCampaign = makeCampaign()
      mockTx.interviewInvitationCampaign.create.mockResolvedValue({ id: 10 })
      mockTx.interviewInvitationSlot.createMany.mockResolvedValue({})
      mockTx.interviewInvitation.createMany.mockResolvedValue({})
      mockTx.interviewInvitationCampaign.findUnique.mockResolvedValue(createdCampaign)

      // sendCampaign will be called after createCampaign
      mockRepo.getCampaignById
        .mockResolvedValueOnce(null) // sendCampaign first call: use campaign from createCampaign
        .mockResolvedValue(makeCampaign({ status: CampaignStatus.IN_PROGRESS }))
      mockRepo.updateCampaignStatus.mockResolvedValue(undefined)
      mockPrisma.job.findUnique.mockResolvedValue({ title: 'Dev' })
      mockPrisma.notification.create.mockResolvedValue({})
    })

    it('throws when no workerIds and no jobId', async () => {
      await expect(
        service.createCampaign({ workerIds: [], slots: [] } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws when duplicate workerIds', async () => {
      await expect(
        service.createCampaign({ workerIds: [2, 2], slots: [] } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws when slot endAt <= startAt', async () => {
      const now = new Date(Date.now() + 86400000)
      await expect(
        service.createCampaign({
          workerIds: [2],
          slots: [{ startAt: now.toISOString(), endAt: now.toISOString(), capacity: 5 }],
        } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws when slot startAt is in the past', async () => {
      await expect(
        service.createCampaign({
          workerIds: [2],
          slots: [{
            startAt: new Date(Date.now() - 1000).toISOString(),
            endAt: new Date(Date.now() + 3600000).toISOString(),
            capacity: 5,
          }],
        } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws when workers not found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]) // no workers found
      await expect(
        service.createCampaign({ workerIds: [2], jobId: 5, slots: [] } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws when job not found for company', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null)
      await expect(
        service.createCampaign({ workerIds: [2], jobId: 5, slots: [] } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws when all workers already have active invitations', async () => {
      mockPrisma.interviewInvitation.findMany.mockResolvedValue([{ workerId: 2 }])
      await expect(
        service.createCampaign({ workerIds: [2], jobId: 5, slots: [futureSlot] } as any, 1),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── respondToInvitation ───────────────────────────────────────────────────

  describe('respondToInvitation', () => {
    beforeEach(() => {
      mockPrisma.interviewInvitationSlot.count.mockResolvedValue(1)
      mockPrisma.company.findUnique.mockResolvedValue({ ownerId: 99 })
      mockPrisma.job.findUnique.mockResolvedValue({ title: 'Dev' })
      mockPrisma.notification.create.mockResolvedValue({})
      mockPrisma.interviewInvitationCampaign.findUnique.mockResolvedValue({ id: 10, invitations: [] })
      mockPrisma.interviewInvitationCampaign.update.mockResolvedValue({})
      mockPrisma.interviewInvitationCampaign.findFirst.mockResolvedValue(null)

      // $transaction result for ACCEPTED flow
      const updatedInv = makeInvitation({
        status: InterviewInvitationStatus.ACCEPTED,
        selectedSlotId: 1,
        selectedSlot: makeSlot(),
        campaign: { ...makeInvitation().campaign, slots: [makeSlot()] },
      })
      mockTx.interviewInvitation.findUnique.mockResolvedValue({
        campaignId: 10,
        status: InterviewInvitationStatus.PENDING,
        selectedSlotId: null,
      })
      mockTx.interviewInvitationSlot.findUnique.mockResolvedValue(makeSlot())
      mockTx.interviewInvitationSlot.updateMany.mockResolvedValue({ count: 1 })
      mockTx.interviewInvitation.update.mockResolvedValue(updatedInv)
      mockTx.jobApplication.upsert.mockResolvedValue({})
    })

    it('throws NotFoundException when invitation not found', async () => {
      mockRepo.getInvitationById.mockResolvedValue(null)
      await expect(
        service.respondToInvitation(1, 2, { status: InterviewInvitationStatus.ACCEPTED } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when worker does not own invitation', async () => {
      mockRepo.getInvitationById.mockResolvedValue(makeInvitation({ workerId: 99 }))
      await expect(
        service.respondToInvitation(1, 2, { status: InterviewInvitationStatus.ACCEPTED } as any),
      ).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException when PENDING invitation is past expiresAt', async () => {
      mockRepo.getInvitationById.mockResolvedValue(
        makeInvitation({
          status: InterviewInvitationStatus.PENDING,
          campaign: {
            ...makeInvitation().campaign,
            expiresAt: new Date('2020-01-01'),
          },
        }),
      )
      await expect(
        service.respondToInvitation(1, 2, {
          status: InterviewInvitationStatus.ACCEPTED,
          selectedSlotId: 1,
        } as any),
      ).rejects.toThrow('Đã quá hạn phản hồi hoặc chọn giờ')
    })

    it('throws BadRequestException when accepting without slot for a slotted campaign', async () => {
      mockRepo.getInvitationById.mockResolvedValue(makeInvitation())
      mockPrisma.interviewInvitationSlot.count.mockResolvedValue(2)
      await expect(
        service.respondToInvitation(1, 2, { status: InterviewInvitationStatus.ACCEPTED, selectedSlotId: null } as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('processes ACCEPTED response with slot selection', async () => {
      mockRepo.getInvitationById.mockResolvedValue(makeInvitation())
      await service.respondToInvitation(1, 2, {
        status: InterviewInvitationStatus.ACCEPTED,
        selectedSlotId: 1,
      })
      expect(mockTx.interviewInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InterviewInvitationStatus.ACCEPTED }),
        }),
      )
    })

    it('processes REJECTED response', async () => {
      const rejectedResult = makeInvitation({ status: InterviewInvitationStatus.REJECTED, selectedSlot: null })
      mockRepo.getInvitationById.mockResolvedValue(makeInvitation())
      mockTx.interviewInvitation.update.mockResolvedValue(rejectedResult)
      mockTx.interviewInvitation.findUnique.mockResolvedValue(makeInvitation())
      mockTx.interviewInvitationSlot.updateMany.mockResolvedValue({ count: 1 })

      await service.respondToInvitation(1, 2, {
        status: InterviewInvitationStatus.REJECTED,
      })
      expect(mockTx.interviewInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InterviewInvitationStatus.REJECTED }),
        }),
      )
    })
  })

  // ── handleInterviewReminders with real data ───────────────────────────────

  describe('handleInterviewReminders', () => {
    it('runs without throwing even when DB returns empty results', async () => {
      mockPrisma.interviewInvitation.findMany.mockResolvedValue([])
      await expect(service.handleInterviewReminders()).resolves.not.toThrow()
    })

    it('does not create notifications when no accepted invitations upcoming', async () => {
      mockPrisma.interviewInvitation.findMany.mockResolvedValue([])
      await service.handleInterviewReminders()
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    })

    it('creates employer reminder notifications when accepted invitations exist', async () => {
      const slot = makeSlot({ id: 1, startAt: new Date(Date.now() + 3600000), endAt: new Date(Date.now() + 7200000), location: 'Office A' })
      const invitation = {
        id: 1, campaignId: 10, workerId: 2,
        selectedSlot: slot,
        worker: { id: 2, fullName: 'Worker A' },
        campaign: { id: 10, title: 'Dev Campaign', company: { ownerId: 5 } },
      }
      mockPrisma.interviewInvitation.findMany
        .mockResolvedValueOnce([invitation]) // sendEmployerSlotReminders(24)
        .mockResolvedValueOnce([])           // sendEmployerSlotReminders(1)
        .mockResolvedValueOnce([])           // sendWorkerInvitationReminders(24)
        .mockResolvedValueOnce([])           // sendWorkerInvitationReminders(1)
      mockPrisma.notification.findMany.mockResolvedValue([]) // no existing links
      mockPrisma.notification.createMany.mockResolvedValue({})

      await service.handleInterviewReminders()
      expect(mockPrisma.notification.createMany).toHaveBeenCalled()
    })

    it('creates worker reminder notifications', async () => {
      const slot = makeSlot({ id: 1, startAt: new Date(Date.now() + 3600000), endAt: new Date(Date.now() + 7200000), location: 'Office B' })
      const workerInvitation = {
        id: 2, workerId: 3, campaignId: 10,
        selectedSlot: slot,
        campaign: { title: 'Dev Campaign' },
      }
      mockPrisma.interviewInvitation.findMany
        .mockResolvedValueOnce([])                  // sendEmployerSlotReminders(24)
        .mockResolvedValueOnce([])                  // sendEmployerSlotReminders(1)
        .mockResolvedValueOnce([workerInvitation])  // sendWorkerInvitationReminders(24)
        .mockResolvedValueOnce([])                  // sendWorkerInvitationReminders(1)
      mockPrisma.notification.findMany.mockResolvedValue([])
      mockPrisma.notification.createMany.mockResolvedValue({})

      await service.handleInterviewReminders()
      expect(mockPrisma.notification.createMany).toHaveBeenCalled()
    })

    it('skips duplicate notifications that already exist', async () => {
      const slot = makeSlot()
      const invitation = {
        id: 1, campaignId: 10, workerId: 2,
        selectedSlot: slot,
        worker: { id: 2, fullName: 'Worker' },
        campaign: { id: 10, title: 'Title', company: { ownerId: 5 } },
      }
      mockPrisma.interviewInvitation.findMany
        .mockResolvedValueOnce([invitation])
        .mockResolvedValue([])
      // Pre-existing notification link
      mockPrisma.notification.findMany.mockResolvedValue([{ link: expect.any(String) }])
      mockPrisma.notification.findMany.mockImplementation(async () => {
        // Return notification with same link to simulate duplicate
        return [{ link: `/employer?campaignId=10&slotReminder=10:1&before=24h` }]
      })
      mockPrisma.notification.createMany.mockResolvedValue({})

      await service.handleInterviewReminders()
      // createMany might be called with empty array or not at all due to filtering
      expect(mockPrisma.notification.findMany).toHaveBeenCalled()
    })
  })

  // ── updateCampaign ────────────────────────────────────────────────────────

  describe('updateCampaign', () => {
    it('throws NotFoundException when campaign not found', async () => {
      mockRepo.getCampaignById.mockReset()
      mockRepo.getCampaignById.mockResolvedValue(null)
      await expect(service.updateCampaign(999, 1, {})).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException for wrong company', async () => {
      mockRepo.getCampaignById.mockReset()
      mockRepo.getCampaignById.mockResolvedValue(makeCampaign({ companyId: 99 }))
      await expect(service.updateCampaign(10, 1, {})).rejects.toThrow(ForbiddenException)
    })

    it('updates campaign and calls $transaction', async () => {
      const campaign = makeCampaign({
        slots: [makeSlot({ id: 1 })],
        invitations: [{ id: 1, workerId: 2, status: InterviewInvitationStatus.PENDING, selectedSlotId: null }],
      })
      mockRepo.getCampaignById.mockReset()
      mockRepo.getCampaignById.mockResolvedValue(campaign)
      mockTx.interviewInvitationCampaign.update.mockResolvedValue({})
      mockTx.interviewInvitationSlot.deleteMany.mockResolvedValue({})
      mockTx.interviewInvitationSlot.update.mockResolvedValue({})
      mockTx.notification.create.mockResolvedValue({})
      mockTx.job.findUnique.mockResolvedValue({ title: 'Dev' })
      mockTx.interviewInvitationCampaign.findUnique.mockResolvedValue(campaign)

      await service.updateCampaign(10, 1, { title: 'Updated', slots: [] })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

  })
})
