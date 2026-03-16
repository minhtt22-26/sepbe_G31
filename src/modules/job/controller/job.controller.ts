import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Put,
  Query,
  ParseIntPipe,
  BadRequestException,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common'
import { JobService } from '../service/job.service'
import { CreateJobRequest } from '../dtos/request/create-job.request'
import { UpdateJobRequest } from '../dtos/request/update-job.request'
import { UpdateApplicationStatusRequest } from '../dtos/request/update-application-status.request'
import { JobSearchDto } from '../dtos/job.search.request.dto'
import { WishlistRequestDto } from '../dtos/job.wishlist.request.dto'
import { JobReportDto } from '../dtos/job.report.request.dto'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ApplyJobRequest } from '../dtos/request/apply-job.request'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
  AuthRoleProtected,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { CompanyService } from 'src/modules/company/company.service'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { JobStatus, ReportStatus } from 'src/generated/prisma/enums'

@ApiTags('Job')
@Controller('job')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly companyService: CompanyService,
  ) { }

  // Search jobs (Elastic)
  //api/job/search?keyword=abc&sectorId=2&workingShift=AFTERNOON&page=1&limit=10
  @Get('search')
  @ApiOperation({ summary: 'Search jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async search(@Query() q: JobSearchDto) {
    return this.jobService.searchJobs(q)
  }

  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @Get('get-for-employer')
  async getForEmployer(@AuthJwtPayload() user: any, @Query() q: JobSearchDto) {
    const ownerId = user.userId
    const company = await this.companyService.findByOwnerId(ownerId)
    q.companyId = company.id
    return this.jobService.searchJobs(q)
  }

  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create new job' })
  @Post()
  async create(@AuthJwtPayload() user: any, @Body() dto: CreateJobRequest) {
    const ownerId = user.userId
    const company = await this.companyService.findByOwnerId(ownerId)
    return this.jobService.createJob(dto, company.id)
  }

  @Get('wishlist')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  async getWishlist(
    @Query() q: WishlistRequestDto,
    @AuthJwtPayload() user: any,
  ) {
    return this.jobService.getWistlist(user.userId, q.page, q.limit, q.skip)
  }

  @Get('employer/applications')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get applications for employer' })
  async getApplicationsForEmployer(
    @AuthJwtPayload() user: any,
    @Query('jobId') jobId?: string,
  ) {
    const ownerId = user.userId
    const company = await this.companyService.findByOwnerId(ownerId)
    const parsedJobId = jobId ? parseInt(jobId, 10) : undefined
    if (parsedJobId !== undefined && isNaN(parsedJobId)) {
      throw new BadRequestException('jobId must be a number')
    }
    return this.jobService.getApplicationsForEmployer(company.id, parsedJobId)
  }

  @Put('applications/:applicationId/status')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update application status by employer' })
  async updateApplicationStatus(
    @AuthJwtPayload() user: any,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() body: UpdateApplicationStatusRequest,
  ) {
    const ownerId = user.userId
    const company = await this.companyService.findByOwnerId(ownerId)
    return this.jobService.updateApplicationStatus(
      applicationId,
      company.id,
      body.status,
    )
  }

  // GET JOB DETAIL
  @Get(':id')
  @ApiOperation({ summary: 'Get job detail by id' })
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.getDetail(id)
  }

  @Get(':id/apply-form')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Get apply form by job id' })
  async getApplyForm(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.getApplyForm(id)
  }

  @Get('me/applications')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Get apply history for current user' })
  @ApiBearerAuth('access-token')
  @AuthJwtAccessProtected()
  async getMyApplications(@AuthJwtPayload('userId') userId: number) {
    return this.jobService.getApplicationsByUser(userId)
  }

  @Post(':id/apply')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Apply job with form answers' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Job ID' })
  @ApiBody({
    type: ApplyJobRequest,
    examples: {
      default: {
        summary: 'Apply payload mẫu',
        value: {
          answers: [
            {
              fieldId: 1,
              value: 'Nguyễn Văn A - 3 năm kinh nghiệm',
            },
            {
              fieldId: 2,
              value: 'Java, Spring Boot, PostgreSQL',
            },
            {
              fieldId: 3,
              value: 'Có thể đi làm từ 15/03/2026',
            },
          ],
        },
      },
    },
  })
  @AuthJwtAccessProtected()
  async applyJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApplyJobRequest,
    @AuthJwtPayload('userId') userId: number,
  ) {
    return this.jobService.applyJob(id, userId, body)
  }

  @Patch(':id/cancel-apply')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Cancel applied job' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Job ID' })
  @AuthJwtAccessProtected()
  async cancelApply(
    @Param('id', ParseIntPipe) id: number,
    @AuthJwtPayload('userId') userId: number,
  ) {
    return this.jobService.cancelApplyJob(id, userId)
  }

  @Put(':id')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update job' })
  async update(
    @AuthJwtPayload() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateJobRequest,
  ) {
    const ownerId = user.userId
    const company = await this.companyService.findByOwnerId(ownerId)
    return this.jobService.updateJob(id, body, company.id)
  }

  // DELETE JOB
  @Delete(':id')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete job (Soft delete)' })
  async delete(
    @AuthJwtPayload() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const ownerId = user.userId
    const company = await this.companyService.findByOwnerId(ownerId)
    return this.jobService.deleteJob(id, company.id)
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related jobs' })
  async getRelatedJobs(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.getRelatedJobs(id)
  }

  // wishlist endpoint previously here

  @Post('save/:jobId')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Save a job' })
  @ApiResponse({ status: 201, description: 'Job saved successfully' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  async saveJob(@Param('jobId') jobId: string, @AuthJwtPayload() user: any) {
    return this.jobService.saveJob(user.userId, +jobId)
  }

  @Delete('unsave/:jobId')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @ApiOperation({ summary: 'Unsave a job' })
  @ApiResponse({ status: 200, description: 'Job unsaved successfully' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  async unSaveJob(@Param('jobId') jobId: string, @AuthJwtPayload() user: any) {
    return this.jobService.unSaveJob(user.userId, +jobId)
  }
  //report job endpoint
  @Post('report')
  @ApiOperation({ summary: 'Report a job' })
  @ApiResponse({ status: 201, description: 'Job report successfully' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  async reportJob(@Body() body: JobReportDto, @AuthJwtPayload('userId') userId: number) {
    return this.jobService.reportJob(userId, body);
  }
  //report job endpoint
  @Post('report/all')
  @ApiOperation({ summary: 'Report a job' })
  @ApiResponse({ status: 201, description: 'Job report successfully' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  async getAllJobReport(@Query('status', new ParseEnumPipe(ReportStatus, {
    exceptionFactory: () => {
      return new BadRequestException("Status must be PENDING, RESOLVED, REJECTED")
    }
  })) status: ReportStatus, @AuthJwtPayload('userId') userId: number, @Query('page') page: number, @Query('limit') limit: number) {
    return this.jobService.getAllJobReport(userId, status, page, limit);
  }
}
