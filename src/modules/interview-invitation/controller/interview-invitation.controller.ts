import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { InterviewInvitationService } from '../service/interview-invitation.service'
import { CreateCampaignRequestDto } from '../dtos/request/create-campaign.request.dto'
import { RespondInvitationRequestDto } from '../dtos/request/respond-invitation.request.dto'
import { GetCampaignsRequestDto } from '../dtos/request/get-campaigns.request.dto'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
  AuthRoleProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { CompanyService } from 'src/modules/company/company.service'

@ApiTags('Interview Invitations')
@Controller('interview-invitations')
export class InterviewInvitationController {
  constructor(
    private readonly interviewInvitationService: InterviewInvitationService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Employer: Tạo chiến dịch mời phỏng vấn
   */
  @Post('campaigns')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo chiến dịch mời phỏng vấn' })
  @ApiResponse({ status: 201, description: 'Chiến dịch được tạo thành công' })
  async createCampaign(
    @AuthJwtPayload() user: any,
    @Body() dto: CreateCampaignRequestDto,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    return this.interviewInvitationService.createCampaign(dto, company.id)
  }

  /**
   * Employer: Gửi chiến dịch mời phỏng vấn
   */
  @Put('campaigns/:campaignId/send')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi chiến dịch mời phỏng vấn' })
  @ApiResponse({ status: 200, description: 'Chiến dịch được gửi thành công' })
  async sendCampaign(
    @AuthJwtPayload() user: any,
    @Param('campaignId', ParseIntPipe) campaignId: number,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    return this.interviewInvitationService.sendCampaign(campaignId, company.id)
  }

  /**
   * Employer: Hủy chiến dịch
   */
  @Put('campaigns/:campaignId/cancel')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Hủy chiến dịch mời phỏng vấn' })
  @ApiResponse({ status: 200, description: 'Chiến dịch được hủy thành công' })
  async cancelCampaign(
    @AuthJwtPayload() user: any,
    @Param('campaignId', ParseIntPipe) campaignId: number,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    return this.interviewInvitationService.cancelCampaign(campaignId, company.id)
  }

  /**
   * Employer: Lấy danh sách chiến dịch của công ty
   */
  @Get('campaigns')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách chiến dịch' })
  @ApiResponse({ status: 200, description: 'Danh sách chiến dịch' })
  async getCampaigns(
    @AuthJwtPayload() user: any,
    @Query() dto: GetCampaignsRequestDto,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    return this.interviewInvitationService.getCampaignsForCompany(company.id, dto)
  }

  /**
   * Employer: Lấy chi tiết chiến dịch
   */
  @Get('campaigns/:campaignId')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy chi tiết chiến dịch' })
  @ApiResponse({ status: 200, description: 'Chi tiết chiến dịch' })
  async getCampaignDetail(
    @AuthJwtPayload() user: any,
    @Param('campaignId', ParseIntPipe) campaignId: number,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    return this.interviewInvitationService.getCampaignDetail(campaignId, company.id)
  }

  /**
   * Employer: Lấy thống kê chiến dịch
   */
  @Get('campaigns/:campaignId/stats')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy thống kê chiến dịch' })
  @ApiResponse({ status: 200, description: 'Thống kê chiến dịch' })
  async getCampaignStats(
    @AuthJwtPayload() user: any,
    @Param('campaignId', ParseIntPipe) campaignId: number,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    return this.interviewInvitationService.getCampaignStats(campaignId, company.id)
  }

  /**
   * Worker: Lấy danh sách lời mời phỏng vấn
   */
  @Get('my-invitations')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách lời mời phỏng vấn của tôi' })
  @ApiResponse({ status: 200, description: 'Danh sách lời mời' })
  async getMyInvitations(
    @AuthJwtPayload() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.interviewInvitationService.getInvitationsForWorker(
      user.userId,
      Number(page) || 1,
      Number(limit) || 10,
    )
  }

  /**
   * Worker: Phản hồi lời mời phỏng vấn
   */
  @Put('invitations/:invitationId/respond')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Phản hồi lời mời phỏng vấn' })
  @ApiResponse({ status: 200, description: 'Phản hồi được ghi nhận' })
  async respondToInvitation(
    @AuthJwtPayload() user: any,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @Body() dto: RespondInvitationRequestDto,
  ) {
    return this.interviewInvitationService.respondToInvitation(
      invitationId,
      user.userId,
      dto,
    )
  }
}
