import { Test, TestingModule } from '@nestjs/testing'
import { InterviewInvitationController } from './interview-invitation.controller'
import { InterviewInvitationService } from '../service/interview-invitation.service'
import { CompanyService } from 'src/modules/company/company.service'

const mockService = {
  createCampaign: jest.fn(),
  sendCampaign: jest.fn(),
  updateCampaign: jest.fn(),
  cancelCampaign: jest.fn(),
  getCampaignsForCompany: jest.fn(),
  getCampaignDetail: jest.fn(),
  getCampaignStats: jest.fn(),
  getJobInviteConstraints: jest.fn(),
  getInvitedWorkersByJob: jest.fn(),
  getPendingInvitationsStatus: jest.fn(),
  getInvitationsForWorker: jest.fn(),
  respondToInvitation: jest.fn(),
}

const mockCompanyService = { findByOwnerId: jest.fn() }
const company = { id: 5 }
const user = { userId: 1 }

describe('InterviewInvitationController', () => {
  let controller: InterviewInvitationController

  beforeEach(async () => {
    jest.clearAllMocks()
    mockCompanyService.findByOwnerId.mockResolvedValue(company)

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewInvitationController],
      providers: [
        { provide: InterviewInvitationService, useValue: mockService },
        { provide: CompanyService, useValue: mockCompanyService },
      ],
    }).compile()

    controller = module.get<InterviewInvitationController>(InterviewInvitationController)
  })

  it('createCampaign delegates to service with company id', async () => {
    mockService.createCampaign.mockResolvedValue({ id: 1 })
    const dto: any = { jobId: 5, workerIds: [2] }
    await controller.createCampaign(user, dto)
    expect(mockService.createCampaign).toHaveBeenCalledWith(dto, 5)
  })

  it('sendCampaign delegates to service', async () => {
    mockService.sendCampaign.mockResolvedValue({ id: 1 })
    await controller.sendCampaign(user, 10)
    expect(mockService.sendCampaign).toHaveBeenCalledWith(10, 5)
  })

  it('updateCampaign delegates to service', async () => {
    mockService.updateCampaign.mockResolvedValue({ id: 1 })
    const dto: any = { title: 'Updated' }
    await controller.updateCampaign(user, 10, dto)
    expect(mockService.updateCampaign).toHaveBeenCalledWith(10, 5, dto)
  })

  it('cancelCampaign delegates to service', async () => {
    mockService.cancelCampaign.mockResolvedValue({ id: 1 })
    await controller.cancelCampaign(user, 10)
    expect(mockService.cancelCampaign).toHaveBeenCalledWith(10, 5)
  })

  it('getCampaigns delegates to service', async () => {
    mockService.getCampaignsForCompany.mockResolvedValue({ data: [] })
    const dto: any = { page: 1, limit: 10 }
    await controller.getCampaigns(user, dto)
    expect(mockService.getCampaignsForCompany).toHaveBeenCalledWith(5, dto)
  })

  it('getCampaignDetail delegates to service', async () => {
    mockService.getCampaignDetail.mockResolvedValue({ id: 10 })
    await controller.getCampaignDetail(user, 10)
    expect(mockService.getCampaignDetail).toHaveBeenCalledWith(10, 5)
  })

  it('getCampaignStats delegates to service', async () => {
    mockService.getCampaignStats.mockResolvedValue({ accepted: 5 })
    await controller.getCampaignStats(user, 10)
    expect(mockService.getCampaignStats).toHaveBeenCalledWith(10, 5)
  })

  it('getJobInviteConstraints delegates to service', async () => {
    mockService.getJobInviteConstraints.mockResolvedValue({})
    await controller.getJobInviteConstraints(user, 3)
    expect(mockService.getJobInviteConstraints).toHaveBeenCalledWith(3, 5)
  })

  it('getInvitedWorkers delegates to service', async () => {
    mockService.getInvitedWorkersByJob.mockResolvedValue([])
    await controller.getInvitedWorkers(user, 3)
    expect(mockService.getInvitedWorkersByJob).toHaveBeenCalledWith(3, 5)
  })

  it('getPendingInvitationsStatus delegates to service with userId', async () => {
    mockService.getPendingInvitationsStatus.mockResolvedValue({ hasPendingJob: false })
    await controller.getPendingInvitationsStatus(user)
    expect(mockService.getPendingInvitationsStatus).toHaveBeenCalledWith(1)
  })

  it('getMyInvitations passes defaults when no params', async () => {
    mockService.getInvitationsForWorker.mockResolvedValue({ data: [] })
    await controller.getMyInvitations(user)
    expect(mockService.getInvitationsForWorker).toHaveBeenCalledWith(1, 1, 10, undefined)
  })

  it('getMyInvitations passes type filter', async () => {
    mockService.getInvitationsForWorker.mockResolvedValue({ data: [] })
    await controller.getMyInvitations(user, 2, 5, 'job')
    expect(mockService.getInvitationsForWorker).toHaveBeenCalledWith(1, 2, 5, 'job')
  })

  it('respondToInvitation delegates to service', async () => {
    mockService.respondToInvitation.mockResolvedValue({ id: 1 })
    const dto: any = { status: 'ACCEPTED', selectedSlotId: 1 }
    await controller.respondToInvitation(user, 7, dto)
    expect(mockService.respondToInvitation).toHaveBeenCalledWith(7, 1, dto)
  })
})
