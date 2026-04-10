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
import { InterviewInvitationStatus, CampaignStatus } from 'src/generated/prisma/enums'
import { NotificationsService } from 'src/modules/notifications/notifications.service'
import { ChatService } from 'src/modules/chat/service/chat.service'

@Injectable()
export class InterviewInvitationService {
  constructor(
    private readonly repository: InterviewInvitationRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Tạo chiến dịch mời phỏng vấn
   */
  async createCampaign(dto: CreateCampaignRequestDto, companyId: number) {
    const { title, description, message, jobId, workerIds, expiresAt, scheduledAt } = dto

    // Validate worker IDs
    if (!workerIds || workerIds.length === 0) {
      throw new BadRequestException('Phải chọn ít nhất 1 worker để mời')
    }

    // Validate unique worker IDs
    if (new Set(workerIds).size !== workerIds.length) {
      throw new BadRequestException('Danh sách worker chứa ID trùng lặp')
    }

    // Validate workers exist
    const workers = await this.prisma.user.findMany({
      where: { id: { in: workerIds } },
    })

    if (workers.length !== workerIds.length) {
      throw new BadRequestException('Một số worker không tồn tại')
    }

    // Create campaign
    const campaign = await this.repository.createCampaign({
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
    })

    // Create individual invitations
    const invitations = workerIds.map((workerId) => ({
      campaignId: campaign.id,
      workerId,
      status: InterviewInvitationStatus.PENDING,
    }))

    try {
      await this.prisma.interviewInvitation.createMany({
        data: invitations,
        skipDuplicates: true,
      })
    } catch {
      throw new BadRequestException('Không thể tạo lời mời. Có thể một số worker đã được mời trước đó')
    }

    return this.repository.getCampaignById(campaign.id)
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

    for (const invitation of invitations) {
      try {
        // Send notification
        await this.prisma.notification.create({
          data: {
            userId: invitation.workerId,
            title: `Mời phỏng vấn: ${campaign.title}`,
            message: campaign.message,
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
        },
        company: i.campaign.company
          ? {
              id: i.campaign.company.id,
              name: i.campaign.company.name,
              logoUrl: i.campaign.company.logoUrl,
            }
          : null,
        status: i.status,
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

    if (invitation.status !== InterviewInvitationStatus.PENDING) {
      throw new BadRequestException('Lời mời này đã được phản hồi rồi')
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

    // Update invitation status
    const updatedInvitation = await this.repository.updateInvitationStatus(
      invitationId,
      dto.status,
      dto.responseMessage,
    )

    // Update campaign stats
    await this.updateCampaignStats(invitation.campaign.id)

    // Get company owner to send notification
    const company = await this.prisma.company.findUnique({
      where: { id: invitation.campaign.companyId },
      select: { ownerId: true },
    })

    // Send notification to company owner
    if (company) {
      await this.prisma.notification.create({
        data: {
          userId: company.ownerId,
          title: `Worker ${invitation.worker.fullName} đã phản hồi lời mời`,
          message: `${invitation.worker.fullName} đã ${dto.status === InterviewInvitationStatus.ACCEPTED ? 'chấp nhận' : 'từ chối'} lời mời phỏng vấn cho ${invitation.campaign.title}`,
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

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy chiến dịch đã hoàn thành')
    }

    // Update campaign status
    await this.repository.updateCampaignStatus(campaignId, CampaignStatus.CANCELLED)

    // Update all pending invitations to CANCELLED
    await this.prisma.interviewInvitation.updateMany({
      where: {
        campaignId,
        status: InterviewInvitationStatus.PENDING,
      },
      data: {
        status: InterviewInvitationStatus.CANCELLED,
      },
    })

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
}
