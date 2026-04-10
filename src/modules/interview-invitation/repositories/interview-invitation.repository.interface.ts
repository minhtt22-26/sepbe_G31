import { CampaignStatus, InterviewInvitationStatus } from 'src/generated/prisma/enums'

export interface IInterviewInvitationRepository {
  createCampaign(data: unknown): Promise<unknown>
  getCampaignById(campaignId: number): Promise<unknown>
  getCampaignsByCompany(
    companyId: number,
    page: number,
    limit: number,
    status?: CampaignStatus,
  ): Promise<{ campaigns: unknown[]; total: number }>
  bulkCreateInvitations(data: unknown[]): Promise<{ count: number }>
  getInvitationById(invitationId: number): Promise<unknown>
  getInvitationsByWorker(
    workerId: number,
    page: number,
    limit: number,
  ): Promise<{ invitations: unknown[]; total: number }>
  updateInvitationStatus(invitationId: number, status: InterviewInvitationStatus, message?: string): Promise<any>
  getCampaignStats(campaignId: number): Promise<unknown>
  getScheduledCampaigns(): Promise<unknown[]>
  updateCampaignStatus(campaignId: number, status: CampaignStatus): Promise<unknown>
}
