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
  JobApplicationStatus,
} from 'src/generated/prisma/enums'
import { Cron, CronExpression } from '@nestjs/schedule'
import { NotificationsService } from 'src/modules/notifications/notifications.service'
import { ChatService } from 'src/modules/chat/service/chat.service'

@Injectable()
export class InterviewInvitationService {
  constructor(
    private readonly repository: InterviewInvitationRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
  ) { }

  private isCampaignExpired(expiresAt: Date | string | null | undefined): boolean {
    if (!expiresAt) return false
    const deadline = new Date(expiresAt)
    return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()
  }

  private resolveWorkerInvitationStatus(
    status: InterviewInvitationStatus,
    expiresAt: Date | string | null | undefined,
  ): InterviewInvitationStatus {
    if (
      status === InterviewInvitationStatus.PENDING &&
      this.isCampaignExpired(expiresAt)
    ) {
      return InterviewInvitationStatus.EXPIRED
    }
    return status
  }

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
      return
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

  private buildCampaignTitle(jobTitle?: string | null, isSlotLess = false) {
    if (isSlotLess) {
      if (jobTitle?.trim()) {
        return `Đề xuất ứng tuyển - ${jobTitle.trim()}`
      }
      return 'Đề xuất ứng tuyển'
    }
    if (jobTitle?.trim()) {
      return `Lịch phỏng vấn - ${jobTitle.trim()}`
    }
    return 'Lịch phỏng vấn ứng viên'
  }

  private buildCampaignMessage(jobTitle?: string | null, isSlotLess = false) {
    if (isSlotLess) {
      if (jobTitle?.trim()) {
        return `Chúng tôi nhận thấy hồ sơ của bạn phù hợp với vị trí ${jobTitle.trim()}. Nếu bạn quan tâm, hãy xác nhận để chúng tôi xem xét hồ sơ của bạn.`
      }
      return 'Chúng tôi nhận thấy hồ sơ của bạn phù hợp với công việc này. Nếu bạn quan tâm, hãy xác nhận để chúng tôi xem xét hồ sơ của bạn.'
    }
    if (jobTitle?.trim()) {
      return `Chúng tôi mời bạn tham gia phỏng vấn cho vị trí ${jobTitle.trim()}. Vui lòng chọn ca phù hợp và xác nhận tham gia đúng giờ.`
    }
    return 'Chúng tôi mời bạn tham gia phỏng vấn. Vui lòng chọn ca phù hợp và xác nhận tham gia đúng giờ.'
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleInterviewReminders() {
    try {
      await this.sendEmployerSlotReminders(24)
      await this.sendEmployerSlotReminders(1)
      await this.sendWorkerInvitationReminders(24)
      await this.sendWorkerInvitationReminders(1)
    } catch (error) {
      console.error('Error sending interview reminders:', error)
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

    const reminderTag = `${hoursBefore}h`
    const candidates = Array.from(grouped.entries()).map(([slotKey, item]) => {
      const link = `/employer?campaignId=${item.campaignId}&slotReminder=${slotKey}&before=${reminderTag}`
      const startText = new Date(item.startAt).toLocaleString('vi-VN')
      const endText = new Date(item.endAt).toLocaleString('vi-VN')
      const locationText = item.location || 'Chưa cập nhật địa điểm'
      return {
        userId: item.ownerId,
        title: `Nhắc lịch phỏng vấn trước ${hoursBefore} giờ`,
        message: `Ca phỏng vấn của chiến dịch "${item.title}" sẽ diễn ra lúc ${startText} - ${endText} tại ${locationText}. Hiện có ${item.acceptedCount} ứng viên đã xác nhận.`,
        link,
      }
    })

    if (!candidates.length) return

    const existingLinks = new Set(
      (
        await this.prisma.notification.findMany({
          where: { link: { in: candidates.map((c) => c.link) } },
          select: { link: true },
        })
      ).map((n) => n.link),
    )

    const toCreate = candidates.filter((c) => !existingLinks.has(c.link))
    if (toCreate.length) {
      await this.prisma.notification.createMany({ data: toCreate })
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

    const reminderTag = `${hoursBefore}h`
    const candidates = acceptedInvitations
      .filter((inv) => inv.selectedSlot)
      .map((inv) => {
        const slot = inv.selectedSlot!
        const link = `/interview-invitations/${inv.id}?before=${reminderTag}&slotId=${slot.id}`
        const startText = new Date(slot.startAt).toLocaleString('vi-VN')
        const endText = new Date(slot.endAt).toLocaleString('vi-VN')
        const locationText = slot.location || 'Chưa cập nhật địa điểm'
        return {
          userId: inv.workerId,
          title: `Nhắc lịch phỏng vấn trước ${hoursBefore} giờ`,
          message: `Buổi phỏng vấn "${inv.campaign.title}" của bạn sẽ diễn ra lúc ${startText} - ${endText} tại ${locationText}. Vui lòng chuẩn bị trước giờ hẹn.`,
          link,
        }
      })

    if (!candidates.length) return

    const existingLinks = new Set(
      (
        await this.prisma.notification.findMany({
          where: { link: { in: candidates.map((c) => c.link) } },
          select: { link: true },
        })
      ).map((n) => n.link),
    )

    const toCreate = candidates.filter((c) => !existingLinks.has(c.link))
    if (toCreate.length) {
      await this.prisma.notification.createMany({ data: toCreate })
    }
  }

  /**
   * Tạo chiến dịch mời phỏng vấn
   */
  async createCampaign(dto: CreateCampaignRequestDto, companyId: number) {
    const {
      jobId,
      workerIds,
      slots,
      expiresAt,
    } = dto

    // If workerIds not provided but jobId is provided, auto-select SUITABLE applicants
    let finalWorkerIds = workerIds || []
    if ((!workerIds || workerIds.length === 0) && jobId) {
      const suitableApps = await this.prisma.jobApplication.findMany({
        where: { jobId, status: JobApplicationStatus.SUITABLE },
        select: { userId: true },
      })
      finalWorkerIds = suitableApps.map((a) => a.userId)
    }

    // Validate worker IDs only when creating a campaign without job context.
    if (!jobId && finalWorkerIds.length === 0) {
      throw new BadRequestException('Phải chọn ít nhất 1 worker để mời')
    }

    // Validate unique worker IDs
    if (finalWorkerIds.length > 0 && new Set(finalWorkerIds).size !== finalWorkerIds.length) {
      throw new BadRequestException('Danh sách worker chứa ID trùng lặp')
    }

    this.validateCampaignSlots(slots)

    // Validate workers exist and are WORKER role
    if (finalWorkerIds.length > 0) {
      const workers = await this.prisma.user.findMany({
        where: {
          id: { in: finalWorkerIds },
          role: EnumUserRole.WORKER,
        },
      })

      if (workers.length !== finalWorkerIds.length) {
        throw new BadRequestException('Một số worker không tồn tại')
      }
    }

    const isSlotLess = !slots || slots.length === 0
    let jobTitle: string | null = null
    if (jobId) {
      const job = await this.prisma.job.findFirst({
        where: {
          id: jobId,
          companyId,
        },
        select: { id: true, title: true },
      })

      if (!job) {
        throw new BadRequestException('Không tìm thấy công việc hợp lệ cho chiến dịch này')
      }
      jobTitle = job.title

      if (finalWorkerIds.length > 0) {
        const existingInvitations = await this.prisma.interviewInvitation.findMany({
          where: {
            workerId: { in: finalWorkerIds },
            campaign: {
              companyId,
              jobId,
              slots: isSlotLess ? { none: {} } : { some: {} },
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
          finalWorkerIds = finalWorkerIds.filter(
            (workerId) => !invitedWorkerIdSet.has(workerId),
          )

          if (finalWorkerIds.length === 0) {
            throw new BadRequestException(
              'Các ứng viên phù hợp đã có lời mời phỏng vấn đang hiệu lực cho job này.',
            )
          }
        }
      }

    }

    let effectiveDeadline = expiresAt ? new Date(expiresAt) : null

    if (!isSlotLess) {
      const now = new Date()
      const futureSlots = slots.filter((slot) => new Date(slot.endAt ?? slot.startAt).getTime() > now.getTime())
      const referenceSlots = futureSlots.length > 0 ? futureSlots : slots
      const earliestSlotStart = new Date(
        Math.min(...referenceSlots.map((slot) => new Date(slot.startAt).getTime())),
      )
      const fallbackDeadline = new Date(earliestSlotStart.getTime() - 24 * 60 * 60 * 1000)
      effectiveDeadline = effectiveDeadline || fallbackDeadline

      if (Number.isNaN(effectiveDeadline.getTime())) {
        throw new BadRequestException('Hạn đổi lịch không hợp lệ')
      }

      if (futureSlots.length > 0 && effectiveDeadline.getTime() >= earliestSlotStart.getTime()) {
        throw new BadRequestException('Hạn đổi lịch phải trước ca phỏng vấn sớm nhất chưa diễn ra')
      }
    }

    const campaignTitle = dto.title?.trim() || this.buildCampaignTitle(jobTitle, isSlotLess)
    const campaignMessage = dto.message?.trim() || this.buildCampaignMessage(jobTitle, isSlotLess)

    const createdCampaign = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.interviewInvitationCampaign.create({
        data: {
          companyId,
          jobId: jobId || null,
          title: campaignTitle,
          description: null,
          message: campaignMessage,
          totalCount: finalWorkerIds.length,
          pendingCount: finalWorkerIds.length,
          status: CampaignStatus.DRAFT,
          expiresAt: effectiveDeadline,
          scheduledAt: null,
        },
      })

      if (!isSlotLess) {
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
      }

      if (finalWorkerIds.length > 0) {
        await tx.interviewInvitation.createMany({
          data: finalWorkerIds.map((workerId) => ({
            campaignId: campaign.id,
            workerId,
            status: InterviewInvitationStatus.PENDING,
          })),
          skipDuplicates: true,
        })
      }

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

    if (finalWorkerIds.length > 0 && createdCampaign) {
      return this.sendCampaign(createdCampaign.id, companyId)
    }

    return createdCampaign
  }

  /**
   * Cập nhật chiến dịch mời phỏng vấn
   */
  async updateCampaign(campaignId: number, companyId: number, dto: any) {
    const campaign = await this.repository.getCampaignById(campaignId)

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại')
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật chiến dịch này')
    }

    if (campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Không thể cập nhật chiến dịch đã bị hủy')
    }

    const updatedCampaign = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật thông tin cơ bản
      await tx.interviewInvitationCampaign.update({
        where: { id: campaignId },
        data: {
          title: dto.title ?? campaign.title,
          message: dto.message ?? campaign.message,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : campaign.expiresAt,
        },
      })

      // 2. Xử lý Slots
      const existingSlots = campaign.slots || []
      const incomingSlots = dto.slots || []

      const incomingSlotIds = incomingSlots.filter((s) => s.id).map((s) => s.id)

      // Xóa các slot không còn trong request
      const slotsToDelete = existingSlots.filter((s) => !incomingSlotIds.includes(s.id))
      const deletedSlotIds = slotsToDelete.map((s) => s.id)

      if (deletedSlotIds.length > 0) {
        await tx.interviewInvitationSlot.deleteMany({
          where: { id: { in: deletedSlotIds } },
        })
      }

      const modifiedSlotIds: number[] = []

      // Cập nhật slot hiện tại & Thêm slot mới
      for (const slot of incomingSlots) {
        if (slot.id) {
          const oldSlot = existingSlots.find((s) => s.id === slot.id)
          if (oldSlot) {
            // Kiểm tra xem có thay đổi quan trọng không (thời gian, địa điểm)
            const isModified =
              new Date(slot.startAt).getTime() !== new Date(oldSlot.startAt).getTime() ||
              new Date(slot.endAt).getTime() !== new Date(oldSlot.endAt).getTime() ||
              (slot.location?.trim() || '') !== (oldSlot.location?.trim() || '')

            if (isModified) {
              modifiedSlotIds.push(slot.id)
            }

            await tx.interviewInvitationSlot.update({
              where: { id: slot.id },
              data: {
                startAt: new Date(slot.startAt),
                endAt: new Date(slot.endAt),
                capacity: slot.capacity,
                location: slot.location?.trim() || null,
                note: slot.note?.trim() || null,
              },
            })
          }
        } else {
          // Tạo slot mới
          await tx.interviewInvitationSlot.create({
            data: {
              campaignId,
              startAt: new Date(slot.startAt),
              endAt: new Date(slot.endAt),
              capacity: slot.capacity,
              location: slot.location?.trim() || null,
              note: slot.note?.trim() || null,
            },
          })
        }
      }

      const affectedSlotIds = [...deletedSlotIds, ...modifiedSlotIds]

      // 3. Xử lý Ứng viên (Reset trạng thái nếu slot bị thay đổi/xóa)
      const invitations = campaign.invitations || []
      const affectedWorkerIds: number[] = []

      for (const invitation of invitations) {
        if (invitation.selectedSlotId && affectedSlotIds.includes(invitation.selectedSlotId)) {
          // Reset ứng viên này
          await tx.interviewInvitation.update({
            where: { id: invitation.id },
            data: {
              selectedSlotId: null,
              status: InterviewInvitationStatus.PENDING,
            },
          })
          affectedWorkerIds.push(invitation.workerId)

          // Giảm bookedCount trên slot (chỉ khi slot chưa bị xóa)
          if (!deletedSlotIds.includes(invitation.selectedSlotId)) {
            await tx.interviewInvitationSlot.update({
              where: { id: invitation.selectedSlotId },
              data: { bookedCount: { decrement: 1 } },
            })
          }

          if (invitation.status === InterviewInvitationStatus.ACCEPTED) {
            // Cập nhật lại count campaign
            await tx.interviewInvitationCampaign.update({
              where: { id: campaignId },
              data: {
                acceptedCount: { decrement: 1 },
                pendingCount: { increment: 1 },
              },
            })
          }
        }
      }

      // 4. Gửi Notification
      let jobTitle = campaign.title
      if (campaign.jobId) {
        const job = await tx.job.findUnique({ where: { id: campaign.jobId }, select: { title: true } })
        jobTitle = job?.title || campaign.title
      }

      for (const invitation of invitations) {
        if (affectedWorkerIds.includes(invitation.workerId)) {
          // Gửi thông báo yêu cầu chọn lại ca
          await tx.notification.create({
            data: {
              userId: invitation.workerId,
              title: `Thay đổi ca phỏng vấn: ${jobTitle}`,
              message: `Ca phỏng vấn bạn đã chọn cho vị trí "${jobTitle}" vừa có thay đổi về thời gian hoặc đã bị hủy. Vui lòng vào ứng dụng để xem lịch mới và chọn lại ca phỏng vấn phù hợp nhé!`,
              link: `/interview-invitations?invitationId=${invitation.id}`,
            },
          })
        } else {
          // Gửi thông báo chung
          await tx.notification.create({
            data: {
              userId: invitation.workerId,
              title: `Cập nhật lịch phỏng vấn: ${jobTitle}`,
              message: `Nhà tuyển dụng vừa cập nhật thông tin lịch phỏng vấn cho vị trí "${jobTitle}". Bạn có thể nhấn vào để xem chi tiết.`,
              link: `/interview-invitations?invitationId=${invitation.id}`,
            },
          })
        }
      }

      return tx.interviewInvitationCampaign.findUnique({
        where: { id: campaignId },
        include: {
          company: true,
          invitations: true,
          slots: { orderBy: { startAt: 'asc' } },
        },
      })
    })

    return updatedCampaign
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

    if (campaign.status === CampaignStatus.IN_PROGRESS || campaign.status === CampaignStatus.COMPLETED) {
      return campaign
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

    // Lấy tên công việc thay vì dùng campaign title
    let jobTitle = campaign.title
    if (campaign.jobId) {
      const job = await this.prisma.job.findUnique({ where: { id: campaign.jobId }, select: { title: true } })
      jobTitle = job?.title || campaign.title
    }

    for (const invitation of invitations) {
      try {
        // Send notification
        const isSlotLessCampaign = !campaign.slots || campaign.slots.length === 0
        const notifTitle = isSlotLessCampaign
          ? `Đề xuất việc làm: ${jobTitle}`
          : `Mời phỏng vấn: ${jobTitle}`
        const notifLink = isSlotLessCampaign
          ? `/job-invitations?invitationId=${invitation.id}`
          : `/interview-invitations?invitationId=${invitation.id}`
        await this.prisma.notification.create({
          data: {
            userId: invitation.workerId,
            title: notifTitle,
            message: campaign.message,
            link: notifLink,
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
          bookedCount: (slot as any)._count?.invitations ?? slot.bookedCount,
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
   * Lấy trạng thái lời mời đang chờ phản hồi
   */
  async getPendingInvitationsStatus(workerId: number) {
    const pendingJobCount = await this.prisma.interviewInvitation.count({
      where: {
        workerId,
        status: InterviewInvitationStatus.PENDING,
        campaign: {
          slots: {
            none: {}
          },
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null }
          ]
        }
      }
    })

    const now = new Date()
    const pendingInterviewCount = await this.prisma.interviewInvitation.count({
      where: {
        workerId,
        status: InterviewInvitationStatus.PENDING,
        campaign: {
          slots: {
            some: { startAt: { gt: now } }, // ít nhất 1 ca chưa qua
          },
          OR: [
            { expiresAt: { gt: now } },
            { expiresAt: null },
          ],
        },
      },
    })

    return {
      hasPendingJob: pendingJobCount > 0,
      hasPendingInterview: pendingInterviewCount > 0
    }
  }

  /**
   * Lấy danh sách lời mời của worker
   */
  async getInvitationsForWorker(workerId: number, page: number = 1, limit: number = 10, type?: 'job' | 'interview') {
    const { invitations, total } = await this.repository.getInvitationsByWorker(workerId, page, limit, type)

    return {
      data: invitations.map((i) => ({
        id: i.id,
        campaign: {
          id: i.campaign.id,
          jobId: i.campaign.jobId,
          title: i.campaign.title,
          message: i.campaign.message,
          expiresAt: i.campaign.expiresAt,
          slots: (i.campaign.slots || []).map((slot) => ({
            id: slot.id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            capacity: slot.capacity,
            bookedCount: (slot as any)._count?.invitations ?? slot.bookedCount,
            remainingSeats: Math.max(0, slot.capacity - ((slot as any)._count?.invitations ?? slot.bookedCount)),
            location: slot.location,
            note: slot.note,
          })),
        },
        company: i.campaign.company
          ? {
            id: i.campaign.company.id,
            name: i.campaign.company.name,
            logoUrl: i.campaign.company.logoUrl,
            ownerId: i.campaign.company.ownerId,
          }
          : null,
        status: this.resolveWorkerInvitationStatus(
          i.status,
          i.campaign.expiresAt,
        ),
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
      totalPages: Math.max(1, Math.ceil(total / limit)),
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

    const campaignExpired = this.isCampaignExpired(invitation.campaign?.expiresAt)
    if (campaignExpired) {
      if (invitation.status === InterviewInvitationStatus.PENDING) {
        throw new BadRequestException('Đã quá hạn phản hồi hoặc chọn giờ')
      }
      if (
        invitation.status === InterviewInvitationStatus.REJECTED &&
        dto.status === InterviewInvitationStatus.ACCEPTED
      ) {
        throw new BadRequestException('Đã quá hạn phản hồi hoặc chọn giờ')
      }
    }

    if (
      invitation.status !== InterviewInvitationStatus.PENDING &&
      invitation.status !== InterviewInvitationStatus.ACCEPTED &&
      invitation.status !== InterviewInvitationStatus.REJECTED
    ) {
      throw new BadRequestException('Lời mời này không còn cho phép phản hồi')
    }

    if (
      invitation.status === InterviewInvitationStatus.REJECTED &&
      dto.status !== InterviewInvitationStatus.ACCEPTED
    ) {
      throw new BadRequestException('Lời mời đã từ chối chỉ có thể chọn lại ca phỏng vấn')
    }

    if (
      invitation.status === InterviewInvitationStatus.ACCEPTED &&
      dto.status !== InterviewInvitationStatus.ACCEPTED &&
      dto.status !== InterviewInvitationStatus.REJECTED
    ) {
      throw new BadRequestException('Lời mời đã chấp nhận chỉ có thể đổi ca phỏng vấn hoặc từ chối')
    }

    // Validate response message if rejecting (now optional)
    // Removed the requirement for responseMessage

    if (dto.status === InterviewInvitationStatus.ACCEPTED && !dto.selectedSlotId) {
      // Allow accepting without a slot ONLY if the campaign has no slots
      const campaignSlotsCount = await this.prisma.interviewInvitationSlot.count({
        where: { campaignId: invitation.campaignId },
      })
      if (campaignSlotsCount > 0) {
        throw new BadRequestException('Bạn cần chọn ca phỏng vấn trước khi chấp nhận')
      }
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
          latestInvitation.status !== InterviewInvitationStatus.ACCEPTED &&
          latestInvitation.status !== InterviewInvitationStatus.REJECTED
        ) {
          throw new BadRequestException('Lời mời này không còn cho phép đổi ca')
        }

        let targetSlotId: number | null = null
        if (dto.selectedSlotId) {
          targetSlotId = Number(dto.selectedSlotId)
        }

        const isSlotLess = targetSlotId === null

        if (!isSlotLess) {
          const slot = await tx.interviewInvitationSlot.findUnique({
            where: { id: dto.selectedSlotId },
          })

          if (!slot || slot.campaignId !== latestInvitation.campaignId) {
            throw new BadRequestException('Ca phỏng vấn đã chọn không hợp lệ')
          }

          const isSameSlot = latestInvitation.selectedSlotId === targetSlotId

          if (!isSameSlot) {
            if (
              latestInvitation.status === InterviewInvitationStatus.ACCEPTED &&
              invitation.campaign.expiresAt &&
              new Date() >= invitation.campaign.expiresAt
            ) {
              throw new BadRequestException('Đã quá hạn đổi lịch phỏng vấn')
            }

            if (new Date(slot.startAt) <= new Date()) {
              throw new BadRequestException('Ca phỏng vấn này đã diễn ra rồi, vui lòng chọn ca khác')
            }

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
        }

        const result = await tx.interviewInvitation.update({
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

        // Automatically create/update JobApplication to SUITABLE when candidate accepts the invitation
        if (result.campaign.jobId) {
          await tx.jobApplication.upsert({
            where: {
              jobId_userId: {
                jobId: result.campaign.jobId,
                userId: workerId,
              },
            },
            update: {
              status: JobApplicationStatus.SUITABLE,
              updatedAt: new Date(),
            },
            create: {
              jobId: result.campaign.jobId,
              userId: workerId,
              status: JobApplicationStatus.SUITABLE,
            },
          })
        }

        return result
      })
    } else if (dto.status === InterviewInvitationStatus.REJECTED) {
      updatedInvitation = await this.prisma.$transaction(async (tx) => {
        const latestInvitation = await tx.interviewInvitation.findUnique({
          where: { id: invitationId },
        })

        if (!latestInvitation) {
          throw new NotFoundException('Lời mời không tồn tại')
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

        return tx.interviewInvitation.update({
          where: { id: invitationId },
          data: {
            status: InterviewInvitationStatus.REJECTED,
            responseMessage: dto.responseMessage,
            selectedSlotId: null,
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
      let notifJobTitle = invitation.campaign.title
      if (invitation.campaign.jobId) {
        const job = await this.prisma.job.findUnique({ where: { id: invitation.campaign.jobId }, select: { title: true } })
        notifJobTitle = job?.title || invitation.campaign.title
      }

      const acceptedSlotText =
        dto.status === InterviewInvitationStatus.ACCEPTED &&
          updatedInvitation.selectedSlot
          ? ` | Ca đã chọn: ${this.formatSlotSummary(updatedInvitation.selectedSlot)}`
          : ''

      await this.prisma.notification.create({
        data: {
          userId: company.ownerId,
          title: `Ứng viên ${invitation.worker.fullName} đã phản hồi lời mời`,
          message: `${invitation.worker.fullName} đã ${dto.status === InterviewInvitationStatus.ACCEPTED ? 'chấp nhận' : 'từ chối'} lời mời phỏng vấn cho "${notifJobTitle}"${acceptedSlotText}`,
          link: `/campaigns/${invitation.campaign.id}`,
        },
      })
    }

    // Auto-add worker to existing interview campaign (with slots) if this was a slot-less acceptance
    const isSlotLessAcceptance =
      dto.status === InterviewInvitationStatus.ACCEPTED &&
      updatedInvitation?.campaign?.jobId &&
      (updatedInvitation.campaign.slots || []).length === 0

    if (isSlotLessAcceptance) {
      try {
        const jobId = updatedInvitation.campaign.jobId
        const companyId = updatedInvitation.campaign.companyId || invitation.campaign.companyId
        const currentCampaignId = updatedInvitation.campaign.id

        // Find an active campaign WITH slots for the same job (exclude current slot-less campaign)
        const activeCampaignWithSlots = await this.prisma.interviewInvitationCampaign.findFirst({
          where: {
            jobId,
            companyId,
            id: { not: currentCampaignId },
            status: {
              in: [
                CampaignStatus.DRAFT,
                CampaignStatus.SCHEDULED,
                CampaignStatus.IN_PROGRESS,
                CampaignStatus.COMPLETED,
              ],
            },
            slots: { some: {} },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            slots: { orderBy: { startAt: 'asc' } },
          },
        })

        if (activeCampaignWithSlots) {
          // Check if worker already has an active invitation in that campaign
          const alreadyInvited = await this.prisma.interviewInvitation.findFirst({
            where: {
              workerId,
              campaignId: activeCampaignWithSlots.id,
              status: {
                in: [InterviewInvitationStatus.PENDING, InterviewInvitationStatus.ACCEPTED],
              },
            },
            select: { id: true },
          })

          if (!alreadyInvited) {
            const job = await this.prisma.job.findUnique({
              where: { id: jobId },
              select: { title: true },
            })

            await this.prisma.$transaction(async (tx) => {
              const newInv = await tx.interviewInvitation.create({
                data: {
                  campaignId: activeCampaignWithSlots.id,
                  workerId,
                  status: InterviewInvitationStatus.PENDING,
                },
              })

              await tx.interviewInvitationCampaign.update({
                where: { id: activeCampaignWithSlots.id },
                data: {
                  totalCount: { increment: 1 },
                  pendingCount: { increment: 1 },
                },
              })

              const jobTitle = job?.title || activeCampaignWithSlots.title
              await tx.notification.create({
                data: {
                  userId: workerId,
                  title: `Bạn có lịch phỏng vấn: ${jobTitle}`,
                  message: `Bạn đã nhận được lịch phỏng vấn cho vị trí "${jobTitle}". Vui lòng mở lời mời để chọn ca phù hợp.`,
                  link: `/interview-invitations?invitationId=${newInv.id}`,
                },
              })

              return newInv
            })

            console.log(
              `[AUTO-ADD] Successfully added worker #${workerId} to interview campaign #${activeCampaignWithSlots.id} for job #${jobId}`,
            )
          }
        }
      } catch (error) {
        console.error(
          `[AUTO-ADD ERROR] Failed to auto-add worker #${workerId} to interview campaign:`,
          error,
        )
      }
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

    let cancelJobTitle = campaign.title
    if (campaign.jobId) {
      const job = await this.prisma.job.findUnique({ where: { id: campaign.jobId }, select: { title: true } })
      cancelJobTitle = job?.title || campaign.title
    }

    for (const invitation of affectedInvitations) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: invitation.workerId,
            title: `Lịch phỏng vấn đã bị hủy: ${cancelJobTitle}`,
            message:
              `Nhà tuyển dụng đã hủy lịch phỏng vấn cho vị trí "${cancelJobTitle}". Bạn không cần tham gia buổi phỏng vấn đã chọn trước đó.`,
            link: `/interview-invitations?invitationId=${invitation.id}`,
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

  async getInvitedWorkersByJob(jobId: number, companyId: number) {
    const invitations = await this.prisma.interviewInvitation.findMany({
      where: {
        campaign: {
          jobId,
          companyId,
        },
      },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            slots: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return invitations.map((inv) => ({
      id: inv.id,
      status: inv.status,
      respondedAt: inv.respondedAt,
      createdAt: inv.createdAt,
      type: (inv.campaign.slots || []).length > 0 ? 'INTERVIEW' : 'JOB_INVITE',
      worker: inv.worker,
    }))
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

  /**
   * Gửi lại thông báo cho các ứng viên chưa phản hồi (PENDING) trong chiến dịch
   */
  async resendCampaign(campaignId: number, companyId: number) {
    const campaign = await this.repository.getCampaignById(campaignId)

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại')
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('Bạn không có quyền gửi lại chiến dịch này')
    }

    if (![CampaignStatus.IN_PROGRESS, CampaignStatus.COMPLETED].includes(campaign.status as any)) {
      throw new BadRequestException(
        `Không thể gửi lại chiến dịch ở trạng thái ${campaign.status}. Chỉ có thể gửi lại chiến dịch đã được gửi trước đó.`,
      )
    }

    const pendingInvitations = (campaign.invitations || []).filter(
      (invite) => invite.status === InterviewInvitationStatus.PENDING,
    )

    if (pendingInvitations.length === 0) {
      throw new BadRequestException('Không có ứng viên nào đang chờ phản hồi để gửi lại')
    }

    // Lấy tiêu đề công việc
    let jobTitle = campaign.title
    if (campaign.jobId) {
      const job = await this.prisma.job.findUnique({ where: { id: campaign.jobId }, select: { title: true } })
      jobTitle = job?.title || campaign.title
    }

    for (const invitation of pendingInvitations) {
      try {
        const isSlotLessCampaign = !campaign.slots || campaign.slots.length === 0
        const notifTitle = isSlotLessCampaign
          ? `[Gửi lại] Đề xuất việc làm: ${jobTitle}`
          : `[Gửi lại] Mời phỏng vấn: ${jobTitle}`
        const notifLink = isSlotLessCampaign
          ? `/job-invitations?invitationId=${invitation.id}`
          : `/interview-invitations?invitationId=${invitation.id}`

        await this.prisma.notification.create({
          data: {
            userId: invitation.workerId,
            title: notifTitle,
            message: campaign.message,
            link: notifLink,
          },
        })
      } catch (error) {
        console.error(`Error resending notification to worker ${invitation.workerId}:`, error)
      }
    }

    return { success: true, resentCount: pendingInvitations.length }
  }
}

