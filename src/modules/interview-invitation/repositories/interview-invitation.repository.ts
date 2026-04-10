import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { IInterviewInvitationRepository } from './interview-invitation.repository.interface'
import { InterviewInvitationStatus, CampaignStatus } from 'src/generated/prisma/enums'

@Injectable()
export class InterviewInvitationRepository implements IInterviewInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCampaign(data: any) {
    return this.prisma.interviewInvitationCampaign.create({
      data,
    })
  }

  async getCampaignById(campaignId: number) {
    return this.prisma.interviewInvitationCampaign.findUnique({
      where: { id: campaignId },
      include: {
        invitations: true,
        company: true,
      },
    })
  }

  async getCampaignsByCompany(
    companyId: number,
    page: number,
    limit: number,
    status?: CampaignStatus,
  ) {
    const where = {
      companyId,
      ...(status && { status }),
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.interviewInvitationCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.interviewInvitationCampaign.count({ where }),
    ])

    return { campaigns, total }
  }

  async bulkCreateInvitations(data: any[]) {
    return this.prisma.interviewInvitation.createMany({
      data,
      skipDuplicates: true,
    }) as Promise<{ count: number }>
  }

  async getInvitationById(invitationId: number) {
    return this.prisma.interviewInvitation.findUnique({
      where: { id: invitationId },
      include: {
        campaign: true,
        worker: true,
      },
    })
  }

  async getInvitationsByWorker(workerId: number, page: number, limit: number) {
    const where = { workerId }

    const [invitations, total] = await Promise.all([
      this.prisma.interviewInvitation.findMany({
        where,
        include: {
          campaign: {
            include: {
              company: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.interviewInvitation.count({ where }),
    ])

    return { invitations, total }
  }

  async updateInvitationStatus(
    invitationId: number,
    status: InterviewInvitationStatus,
    message?: string,
  ) {
    return this.prisma.interviewInvitation.update({
      where: { id: invitationId },
      data: {
        status,
        responseMessage: message,
        respondedAt: new Date(),
      },
      include: {
        campaign: true,
        worker: true,
      },
    })
  }

  async getCampaignStats(campaignId: number) {
    const campaign = await this.prisma.interviewInvitationCampaign.findUnique({
      where: { id: campaignId },
      include: {
        invitations: true,
      },
    })

    if (!campaign) return null

    const accepted = campaign.invitations.filter((i) => i.status === InterviewInvitationStatus.ACCEPTED).length
    const rejected = campaign.invitations.filter((i) => i.status === InterviewInvitationStatus.REJECTED).length
    const pending = campaign.invitations.filter((i) => i.status === InterviewInvitationStatus.PENDING).length

    const acceptanceRate = campaign.totalCount > 0 ? Math.round((accepted / campaign.totalCount) * 100) : 0

    return {
      totalInvitations: campaign.totalCount,
      acceptedCount: accepted,
      rejectedCount: rejected,
      pendingCount: pending,
      acceptanceRate,
    }
  }

  async getScheduledCampaigns() {
    return this.prisma.interviewInvitationCampaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: {
          lte: new Date(),
        },
      },
    })
  }

  async updateCampaignStatus(campaignId: number, status: CampaignStatus) {
    const data: any = { status }

    if (status === CampaignStatus.IN_PROGRESS) {
      data.sentAt = new Date()
    } else if (status === CampaignStatus.COMPLETED) {
      data.completedAt = new Date()
    }

    return this.prisma.interviewInvitationCampaign.update({
      where: { id: campaignId },
      data,
    })
  }
}
