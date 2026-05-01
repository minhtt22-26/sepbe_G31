import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { InterviewInvitationRepository } from '../repositories/interview-invitation.repository'
import { CreateCampaignRequestDto } from '../dtos/request/create-campaign.request.dto'
import { RespondInvitationRequestDto } from '../dtos/request/respond-invitation.request.dto'
import { GetCampaignsRequestDto } from '../dtos/request/get-campaigns.request.dto'
import {
  CampaignStatus,
  EnumUserRole,
  InterviewInvitationStatus,
  WalletTransactionType,
} from 'src/generated/prisma/enums'
import { Cron, CronExpression } from '@nestjs/schedule'
import { NotificationsService } from 'src/modules/notifications/notifications.service'
import { ChatService } from 'src/modules/chat/service/chat.service'
import { WalletService } from 'src/modules/wallet/wallet.service'

@Injectable()
export class InterviewInvitationService {
  constructor(
    private readonly repository: InterviewInvitationRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    private readonly walletService: WalletService,
  ) {}

  private formatSlotSummary(slot: {
    startAt: Date
    endAt: Date
    bookedCount: number
    capacity: number
    location?: string | null
  }) {
    const startText = new Date(slot.startAt).toLocaleString('vi-VN')
    const endText = new Date(slot.endAt).toLocaleString('vi-VN')
    const locationText = slot.location ? ` | ${slot.location}` : ''

    return `${startText} - ${endText} (${slot.bookedCount}/${slot.capacity})${locationText}`
  }

  private validateCampaignSlots(slots: CreateCampaignRequestDto['slots']) {
    if (!slots?.length) {
      throw new BadRequestException('Phải tạo ít nhất 1 ca phỏng vấn')
    }

    const normalizedKeys = new Set<string>()
    const now = Date.now()

    for (const slot of slots) {
      const startAt = new Date(slot.startAt)
      const endAt = new Date(slot.endAt)

      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new BadRequestException('Thời gian ca phỏng vấn không hợp lệ')
      }

      if (endAt <= startAt) {
        throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu của ca phỏng vấn')
      }

      if (startAt.getTime() < now) {
        throw new BadRequestException('Không được tạo ca phỏng vấn ở thời gian đã qua')
      }

      const key = `${startAt.toISOString()}_${endAt.toISOString()}`
      if (normalizedKeys.has(key)) {
        throw new BadRequestException('Không được tạo 2 ca phỏng vấn trùng giờ')
      }
      normalizedKeys.add(key)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleEmployerInterviewReminders() {
    try {
      await Promise.all([
        this.sendEmployerSlotReminders(24),
        this.sendEmployerSlotReminders(1),
      ])
    } catch (error) {
      console.error('Error sending employer interview reminders:', error)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleWorkerInterviewReminders() {
    try {
      await Promise.all([
        this.sendWorkerInvitationReminders(24),
        this.sendWorkerInvitationReminders(1),
      ])
    } catch (error) {
      console.error('Error sending worker interview reminders:', error)
    }
  }

  private async sendEmployerSlotReminders(hoursBefore: 24 | 1) {
    const now = new Date()
    const target = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)
    const rangeStart = new Date(target.getTime() - 5 * 60 * 1000)
    const rangeEnd = new Date(target.getTime() + 5 * 60 * 1000)

    const acceptedInvitations = await this.prisma.interviewInvitation.findMany({
      where: {
        status: InterviewInvitationStatus.ACCEPTED,
        selectedSlotId: {
          not: null,
        },
        selectedSlot: {
          startAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        campaign: {
          status: {
            in: [CampaignStatus.IN_PROGRESS, CampaignStatus.COMPLETED],
          },
        },
      },
      include: {
        selectedSlot: true,
        worker: {
          select: {
            id: true,
            fullName: true,
          },
        },
        campaign: {
          include: {
            company: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    })

    const grouped = new Map<
      string,
      {
        campaignId: number
        title: string
        ownerId: number
        startAt: Date
        endAt: Date
        location: string | null
        acceptedCount: number
      }
    >()

    for (const invitation of acceptedInvitations) {
      if (!invitation.selectedSlot || !invitation.campaign?.company?.ownerId) continue

      const key = `${invitation.campaignId}:${invitation.selectedSlot.id}`
      const current = grouped.get(key)

      if (!current) {
        grouped.set(key, {
          campaignId: invitation.campaignId,
          title: invitation.campaign.title,
          ownerId: invitation.campaign.company.ownerId,
          startAt: invitation.selectedSlot.startAt,
          endAt: invitation.selectedSlot.endAt,
          location: invitation.selectedSlot.location,
          acceptedCount: 1,
        })
        continue
      }

      current.acceptedCount += 1
    }

    for (const [slotKey, item] of grouped.entries()) {
      const reminderTag = `${hoursBefore}h`
      const link = `/employer?campaignId=${item.campaignId}&slotReminder=${slotKey}&before=${reminderTag}`

      const existed = await this.prisma.notification.findFirst({
        where: {
          userId: item.ownerId,
          link,
        },
        select: {
          id: true,
        },
      })

      if (existed) continue

      const startText = new Date(item.startAt).toLocaleString('vi-VN')
      const endText = new Date(item.endAt).toLocaleString('vi-VN')
      const locationText = item.location || 'Chưa cập nhật địa điểm'

      await this.prisma.notification.create({
        data: {
          userId: item.ownerId,
          title: `Nhắc lịch phỏng vấn trước ${hoursBefore} giờ`,
          message: `Ca phỏng vấn của chiến dịch "${item.title}" sẽ diễn ra lúc ${startText} - ${endText} tại ${locationText}. Hiện có ${item.acceptedCount} ứng viên đã xác nhận.`,
          link,
        },
      })
    }
  }

  private async sendWorkerInvitationReminders(hoursBefore: 24 | 1) {
    const now = new Date()
    const target = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)
    const rangeStart = new Date(target.getTime() - 5 * 60 * 1000)
    const rangeEnd = new Date(target.getTime() + 5 * 60 * 1000)

    const acceptedInvitations = await this.prisma.interviewInvitation.findMany({
      where: {
        status: InterviewInvitationStatus.ACCEPTED,
        selectedSlotId: {
          not: null,
        },
        selectedSlot: {
          startAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        campaign: {
          status: {
            in: [CampaignStatus.IN_PROGRESS, CampaignStatus.COMPLETED],
          },
        },
      },
      include: {
        selectedSlot: true,
        campaign: {
          select: {
            title: true,
          },
        },
      },
    })

    for (const invitation of acceptedInvitations) {
      if (!invitation.selectedSlot) continue

      const reminderTag = `${hoursBefore}h`
      const link = `/interview-invitations/${invitation.id}?before=${reminderTag}&slotId=${invitation.selectedSlot.id}`

      const existed = await this.prisma.notification.findFirst({
        where: {
          userId: invitation.workerId,
          link,
        },
        select: {
          id: true,
        },
      })

      if (existed) continue

      const startText = new Date(invitation.selectedSlot.startAt).toLocaleString('vi-VN')
      const endText = new Date(invitation.selectedSlot.endAt).toLocaleString('vi-VN')
      const locationText = invitation.selectedSlot.location || 'Chưa cập nhật địa điểm'

      await this.prisma.notification.create({
        data: {
          userId: invitation.workerId,
          title: `Nhắc lịch phỏng vấn trước ${hoursBefore} giờ`,
          message: `Buổi phỏng vấn "${invitation.campaign.title}" của bạn sẽ diễn ra lúc ${startText} - ${endText} tại ${locationText}. Vui lòng chuẩn bị trước giờ hẹn.`,
          link,
        },
      })
    }
  }

  /**
   * Tạo chiến dịch mời phỏng vấn
   */
  async createCampaign(dto: CreateCampaignRequestDto, companyId: number) {
    const {
      title,
      description,
      message,
      jobId,
      workerIds,
      slots,
      expiresAt,
      scheduledAt,
    } = dto

    // Validate worker IDs
    if (!workerIds || workerIds.length === 0) {
      throw new BadRequestException('Phải chọn ít nhất 1 worker để mời')
    }

    // Validate unique worker IDs
    if (new Set(workerIds).size !== workerIds.length) {
      throw new BadRequestException('Danh sách worker chứa ID trùng lặp')
    }

    this.validateCampaignSlots(slots)

    // Validate workers exist and are WORKER role
    const workers = await this.prisma.user.findMany({
      where: {
        id: { in: workerIds },
        role: EnumUserRole.WORKER,
      },
    })

    if (workers.length !== workerIds.length) {
      throw new BadRequestException('Một số worker không tồn tại')
    }

    if (jobId) {
      const job = await this.prisma.job.findFirst({
        where: {
          id: jobId,
          companyId,
        },
        select: { id: true },
      })

      if (!job) {
        throw new BadRequestException('Không tìm thấy công việc hợp lệ cho chiến dịch này')
      }

      const existingInvitations = await this.prisma.interviewInvitation.findMany({
        where: {
          workerId: { in: workerIds },
          campaign: {
            companyId,
            jobId,
          },
          status: {
            in: [
              InterviewInvitationStatus.PENDING,
              InterviewInvitationStatus.ACCEPTED,
            ],
          },
        },
        select: {
          workerId: true,
        },
      })

      const invitedWorkerIdSet = new Set(existingInvitations.map((i) => i.workerId))
      if (invitedWorkerIdSet.size > 0) {
        throw new BadRequestException(
          'Một số ứng viên đã được mời phỏng vấn cho job này, không thể mời lại',
        )
      }

    }

    const createdCampaign = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.interviewInvitationCampaign.create({
        data: {
          companyId,
          jobId: jobId || null,
          title,
          description: description || null,
          message,
          totalCount: workerIds.length,
          pendingCount: workerIds.length,
          status: scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
      })

      await tx.interviewInvitationSlot.createMany({
        data: slots.map((slot) => ({
          campaignId: campaign.id,
          startAt: new Date(slot.startAt),
          endAt: new Date(slot.endAt),
          capacity: slot.capacity,
          location: slot.location?.trim() || null,
          note: slot.note?.trim() || null,
        })),
      })

      await tx.interviewInvitation.createMany({
        data: workerIds.map((workerId) => ({
          campaignId: campaign.id,
          workerId,
          status: InterviewInvitationStatus.PENDING,
        })),
        skipDuplicates: true,
      })

      return tx.interviewInvitationCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          company: true,
          invitations: true,
          slots: {
            orderBy: { startAt: 'asc' },
          },
        },
      })
    })

    return createdCampaign
  }

  /**
   * Gửi chiến dịch mời phỏng vấn (thay đổi từ DRAFT/SCHEDULED sang IN_PROGRESS)
   */
  async sendCampaign(campaignId: number, companyId: number) {
    const campaign = await this.repository.getCampaignById(campaignId)

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại')
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền gửi chiến dịch này')
    }

    if (![CampaignStatus.DRAFT, CampaignStatus.SCHEDULED].includes(campaign.status as any)) {
      throw new BadRequestException(
        `Không thể gửi chiến dịch ở trạng thái ${campaign.status}. Chỉ có thể gửi chiến dịch ở trạng thái DRAFT hoặc SCHEDULED`,
      )
    }

    const workerCount = (campaign.invitations || []).filter(
      (invitation) => invitation.status === InterviewInvitationStatus.PENDING,
    ).length
    if (workerCount <= 0) {
      throw new BadRequestException('Không có ứng viên hợp lệ để gửi lời mời')
    }

    const unitCost = await this.walletService.getPointCost(
      'AI_INVITE_POINT_COST_PER_WORKER',
      1000,
    )
    const totalCost = unitCost * workerCount
    await this.walletService.deductPoints({
      companyId,
      cost: totalCost,
      type: WalletTransactionType.AI_INVITE,
      referenceType: 'INTERVIEW_CAMPAIGN',
      referenceId: campaignId,
      metadata: {
        workerCount,
        unitCost,
      },
    })

    // Update campaign status to IN_PROGRESS
    await this.repository.updateCampaignStatus(campaignId, CampaignStatus.IN_PROGRESS)

    // Send notifications to workers (in background)
    this.sendNotificationsToWorkers(campaign).catch((error) => {
      console.error('Error sending notifications:', error)
    })

    // Update to COMPLETED after finish sending
    setTimeout(() => {
      void this.repository
        .updateCampaignStatus(campaignId, CampaignStatus.COMPLETED)
        .catch((error) => {
          console.error('Error updating campaign status to COMPLETED:', error)
        })
    }, 5000) // Giả sử gửi hết trong 5 giây (thực tế nên dùng queue)

    return this.repository.getCampaignById(campaignId)
  }

  /**
   * Gửi thông báo cho các worker
   */
  private async sendNotificationsToWorkers(campaign: any) {
    const invitations = campaign.invitations || []
    const slots = (campaign.slots || [])
      .map((slot) => `- ${this.formatSlotSummary(slot)}`)
      .join('\n')

    const messageWithSlots = slots
      ? `${campaign.message}\n\nCác ca phỏng vấn:\n${slots}\n\nVui lòng mở lời mời để chọn ca phù hợp.`
      : campaign.message

    for (const invitation of invitations) {
      try {
        // Send notification
        await this.prisma.notification.create({
          data: {
            userId: invitation.workerId,
            title: `Mời phỏng vấn: ${campaign.title}`,
            message: messageWithSlots,
            link: `/interview-invitations/${invitation.id}`,
          },
        })

        // TODO: Send chat message (optional)
        // await this.sendChatMessage(campaign.companyId, invitation.workerId, campaign.message)
      } catch (error) {
        console.error(`Error sending notification to worker ${invitation.workerId}:`, error)
      }
    }
  }

  /**
   * Lấy danh sách chiến dịch của công ty
   */
  async getCampaignsForCompany(companyId: number, dto: GetCampaignsRequestDto) {
    const page = dto.page || 1
    const limit = dto.limit || 10

    const { campaigns, total } = await this.repository.getCampaignsByCompany(
      companyId,
      page,
      limit,
      dto.status,
    )

    return {
      data: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        message: c.message,
        jobId: c.jobId,
        totalCount: c.totalCount,
        acceptedCount: c.acceptedCount,
        rejectedCount: c.rejectedCount,
        pendingCount: c.pendingCount,
        status: c.status,
        scheduledAt: c.scheduledAt,
        sentAt: c.sentAt,
        completedAt: c.completedAt,
        expiresAt: c.expiresAt,
        slots: (c.slots || []).map((slot) => ({
          id: slot.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          capacity: slot.capacity,
          bookedCount: slot.bookedCount,
          location: slot.location,
          note: slot.note,
        })),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      page,
      limit,
      total,
    }
  }

  /**
   * Lấy thông tin chi tiết chiến dịch
   */
  async getCampaignDetail(campaignId: number, companyId: number) {
    const campaign = await this.repository.getCampaignById(campaignId)

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại')
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền xem chiến dịch này')
    }

    const stats = await this.repository.getCampaignStats(campaignId)

    return {
      ...campaign,
      stats,
    }
  }

  /**
   * Lấy danh sách lời mời của worker
   */
  async getInvitationsForWorker(workerId: number, page: number = 1, limit: number = 10) {
    const { invitations, total } = await this.repository.getInvitationsByWorker(workerId, page, limit)

    return {
      data: invitations.map((i) => ({
        id: i.id,
        campaign: {
          id: i.campaign.id,
          title: i.campaign.title,
          message: i.campaign.message,
          expiresAt: i.campaign.expiresAt,
          slots: (i.campaign.slots || []).map((slot) => ({
            id: slot.id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            capacity: slot.capacity,
            bookedCount: slot.bookedCount,
            remainingSeats: Math.max(0, slot.capacity - slot.bookedCount),
            location: slot.location,
            note: slot.note,
          })),
        },
        company: i.campaign.company
          ? {
              id: i.campaign.company.id,
              name: i.campaign.company.name,
              logoUrl: i.campaign.company.logoUrl,
            }
          : null,
        status: i.status,
        selectedSlot: i.selectedSlot
          ? {
              id: i.selectedSlot.id,
              startAt: i.selectedSlot.startAt,
              endAt: i.selectedSlot.endAt,
              location: i.selectedSlot.location,
            }
          : null,
        responseMessage: i.responseMessage,
        respondedAt: i.respondedAt,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
      page,
      limit,
      total,
    }
  }

  /**
   * Worker phản hồi lời mời phỏng vấn
   */
  async respondToInvitation(invitationId: number, workerId: number, dto: RespondInvitationRequestDto) {
    const invitation = await this.repository.getInvitationById(invitationId)

    if (!invitation) {
      throw new NotFoundException('Lời mời không tồn tại')
    }

    if (invitation.workerId !== workerId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi lời mời này')
    }

    if (
      invitation.status !== InterviewInvitationStatus.PENDING &&
      invitation.status !== InterviewInvitationStatus.ACCEPTED
    ) {
      throw new BadRequestException('Lời mời này không còn cho phép phản hồi')
    }

    if (
      invitation.status === InterviewInvitationStatus.ACCEPTED &&
      dto.status !== InterviewInvitationStatus.ACCEPTED
    ) {
      throw new BadRequestException('Lời mời đã chấp nhận chỉ có thể đổi ca phỏng vấn')
    }

    // Check if expired
    if (invitation.campaign.expiresAt && new Date() > invitation.campaign.expiresAt) {
      throw new BadRequestException('Lời mời này đã hết hạn')
    }

    // Validate response message if rejecting
    if (
      dto.status === InterviewInvitationStatus.REJECTED &&
      (!dto.responseMessage || dto.responseMessage.trim().length === 0)
    ) {
      throw new BadRequestException('Phải cung cấp lý do khi từ chối lời mời')
    }

    if (dto.status === InterviewInvitationStatus.ACCEPTED && !dto.selectedSlotId) {
      throw new BadRequestException('Bạn cần chọn ca phỏng vấn trước khi chấp nhận')
    }

    let updatedInvitation: any

    if (dto.status === InterviewInvitationStatus.ACCEPTED) {
      updatedInvitation = await this.prisma.$transaction(async (tx) => {
        const latestInvitation = await tx.interviewInvitation.findUnique({
          where: { id: invitationId },
          select: {
            campaignId: true,
            status: true,
            selectedSlotId: true,
          },
        })

        if (!latestInvitation) {
          throw new NotFoundException('Lời mời không tồn tại')
        }

        if (
          latestInvitation.status !== InterviewInvitationStatus.PENDING &&
          latestInvitation.status !== InterviewInvitationStatus.ACCEPTED
        ) {
          throw new BadRequestException('Lời mời này không còn cho phép đổi ca')
        }

        const targetSlotId = Number(dto.selectedSlotId)
        if (!targetSlotId) {
          throw new BadRequestException('Bạn cần chọn ca phỏng vấn hợp lệ')
        }

        const slot = await tx.interviewInvitationSlot.findUnique({
          where: { id: dto.selectedSlotId },
        })

        if (!slot || slot.campaignId !== latestInvitation.campaignId) {
          throw new BadRequestException('Ca phỏng vấn đã chọn không hợp lệ')
        }

        const isSameSlot = latestInvitation.selectedSlotId === targetSlotId

        if (!isSameSlot) {
          if (slot.bookedCount >= slot.capacity) {
            throw new BadRequestException('Ca phỏng vấn này đã đủ số lượng ứng viên')
          }

          const reserved = await tx.interviewInvitationSlot.updateMany({
            where: {
              id: slot.id,
              bookedCount: slot.bookedCount,
            },
            data: {
              bookedCount: {
                increment: 1,
              },
            },
          })

          if (reserved.count === 0) {
            throw new BadRequestException(
              'Ca phỏng vấn vừa được đặt đầy. Vui lòng chọn ca khác',
            )
          }

          if (latestInvitation.selectedSlotId) {
            await tx.interviewInvitationSlot.updateMany({
              where: {
                id: latestInvitation.selectedSlotId,
                bookedCount: {
                  gte: 1,
                },
              },
              data: {
                bookedCount: {
                  decrement: 1,
                },
              },
            })
          }
        }

        return tx.interviewInvitation.update({
          where: { id: invitationId },
          data: {
            status: InterviewInvitationStatus.ACCEPTED,
            responseMessage: dto.responseMessage,
            selectedSlotId: targetSlotId,
            respondedAt: new Date(),
          },
          include: {
            campaign: {
              include: {
                slots: {
                  orderBy: { startAt: 'asc' },
                },
              },
            },
            worker: true,
            selectedSlot: true,
          },
        })
      })
    } else {
      updatedInvitation = await this.repository.updateInvitationStatus(
        invitationId,
        dto.status,
        dto.responseMessage,
      )
    }

    // Update campaign stats
    await this.updateCampaignStats(invitation.campaign.id)

    // Get company owner to send notification
    const company = await this.prisma.company.findUnique({
      where: { id: invitation.campaign.companyId },
      select: { ownerId: true },
    })

    // Send notification to company owner
    if (company) {
      const acceptedSlotText =
        dto.status === InterviewInvitationStatus.ACCEPTED &&
        updatedInvitation.selectedSlot
          ? ` | Ca đã chọn: ${this.formatSlotSummary(updatedInvitation.selectedSlot)}`
          : ''

      await this.prisma.notification.create({
        data: {
          userId: company.ownerId,
          title: `Worker ${invitation.worker.fullName} đã phản hồi lời mời`,
          message: `${invitation.worker.fullName} đã ${dto.status === InterviewInvitationStatus.ACCEPTED ? 'chấp nhận' : 'từ chối'} lời mời phỏng vấn cho ${invitation.campaign.title}${acceptedSlotText}`,
          link: `/campaigns/${invitation.campaign.id}`,
        },
      })
    }

    return updatedInvitation
  }

  /**
   * Cập nhật thống kê chiến dịch
   */
  private async updateCampaignStats(campaignId: number) {
    const campaign = await this.prisma.interviewInvitationCampaign.findUnique({
      where: { id: campaignId },
      include: {
        invitations: true,
      },
    })

    if (!campaign) return

    const accepted = campaign.invitations.filter(
      (i) => i.status === InterviewInvitationStatus.ACCEPTED,
    ).length
    const rejected = campaign.invitations.filter(
      (i) => i.status === InterviewInvitationStatus.REJECTED,
    ).length
    const pending = campaign.invitations.filter(
      (i) => i.status === InterviewInvitationStatus.PENDING,
    ).length

    await this.prisma.interviewInvitationCampaign.update({
      where: { id: campaignId },
      data: {
        acceptedCount: accepted,
        rejectedCount: rejected,
        pendingCount: pending,
      },
    })
  }

  /**
   * Hủy chiến dịch
   */
  async cancelCampaign(campaignId: number, companyId: number) {
    const campaign = await this.repository.getCampaignById(campaignId)

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại')
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền hủy chiến dịch này')
    }

    if (campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Chiến dịch đã được hủy trước đó')
    }

    const affectedInvitations = (campaign.invitations || []).filter(
      (invitation) =>
        invitation.status === InterviewInvitationStatus.PENDING ||
        invitation.status === InterviewInvitationStatus.ACCEPTED,
    )

    const slotReleaseMap = new Map<number, number>()
    for (const invitation of affectedInvitations) {
      if (
        invitation.status === InterviewInvitationStatus.ACCEPTED &&
        invitation.selectedSlotId
      ) {
        const current = slotReleaseMap.get(invitation.selectedSlotId) || 0
        slotReleaseMap.set(invitation.selectedSlotId, current + 1)
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update campaign status first so worker UI reflects cancellation immediately.
      await tx.interviewInvitationCampaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.CANCELLED,
        },
      })

      if (affectedInvitations.length > 0) {
        await tx.interviewInvitation.updateMany({
          where: {
            campaignId,
            status: {
              in: [
                InterviewInvitationStatus.PENDING,
                InterviewInvitationStatus.ACCEPTED,
              ],
            },
          },
          data: {
            status: InterviewInvitationStatus.CANCELLED,
            selectedSlotId: null,
            respondedAt: new Date(),
          },
        })
      }

      for (const [slotId, releaseCount] of slotReleaseMap) {
        await tx.interviewInvitationSlot.updateMany({
          where: {
            id: slotId,
            bookedCount: { gte: releaseCount },
          },
          data: {
            bookedCount: {
              decrement: releaseCount,
            },
          },
        })
      }
    })

    await this.updateCampaignStats(campaignId)

    for (const invitation of affectedInvitations) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: invitation.workerId,
            title: `Lịch phỏng vấn đã bị hủy: ${campaign.title}`,
            message:
              'Nhà tuyển dụng đã hủy lịch phỏng vấn cho chiến dịch này. Bạn không cần tham gia buổi phỏng vấn đã chọn trước đó.',
            link: `/interview-invitations/${invitation.id}`,
          },
        })
      } catch (error) {
        console.error(
          `Error sending cancellation notification to worker ${invitation.workerId}:`,
          error,
        )
      }
    }

    return this.repository.getCampaignById(campaignId)
  }

  /**
   * Lấy thống kê chiến dịch
   */
  async getCampaignStats(campaignId: number, companyId: number) {
    const campaign = await this.repository.getCampaignById(campaignId)

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại')
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền xem thống kê chiến dịch này')
    }

    return this.repository.getCampaignStats(campaignId)
  }

  async getJobInviteConstraints(jobId: number, companyId: number) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
      },
      select: { id: true },
    })

    if (!job) {
      throw new NotFoundException('Không tìm thấy job của công ty')
    }

    const campaigns = await this.prisma.interviewInvitationCampaign.findMany({
      where: {
        companyId,
        jobId,
      },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
        invitations: {
          select: {
            workerId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const latestCampaignId = campaigns.length
      ? campaigns[campaigns.length - 1].id
      : null

    const invitedWorkerIdSet = new Set<number>()
    const allSlots: Array<{
      id: number
      startAt: Date
      endAt: Date
      capacity: number
      location: string | null
      note: string | null
    }> = []

    for (const campaign of campaigns) {
      for (const invitation of campaign.invitations || []) {
        if (
          invitation.status === InterviewInvitationStatus.PENDING ||
          invitation.status === InterviewInvitationStatus.ACCEPTED
        ) {
          invitedWorkerIdSet.add(invitation.workerId)
        }
      }
      for (const slot of campaign.slots || []) {
        allSlots.push({
          id: slot.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          capacity: slot.capacity,
          location: slot.location,
          note: slot.note,
        })
      }
    }

    const hasExistingSchedule = allSlots.length > 0
    const sortedSlots = [...allSlots].sort(
      (a, b) => a.startAt.getTime() - b.startAt.getTime(),
    )
    const windowStart = hasExistingSchedule ? sortedSlots[0].startAt : null
    const windowEnd = hasExistingSchedule
      ? sortedSlots.reduce(
          (max, slot) => (slot.endAt > max ? slot.endAt : max),
          sortedSlots[0].endAt,
        )
      : null

    return {
      jobId,
      latestCampaignId,
      hasExistingSchedule,
      windowStart,
      windowEnd,
      invitedWorkerIds: Array.from(invitedWorkerIdSet),
      scheduleSlots: sortedSlots.map((slot) => ({
        id: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        capacity: slot.capacity,
        location: slot.location,
        note: slot.note,
      })),
    }
  }
}
