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
  ParseIntPipe
} from '@nestjs/common'
import { JobService } from '../service/job.service'
import { CreateJobRequest } from '../dtos/request/create-job.request';
import { UpdateJobRequest } from '../dtos/request/update-job.request';
import { JobSearchDto } from "../dtos/job.search.request.dto";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApplyJobRequest } from '../dtos/request/apply-job.request';
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';

@ApiTags('Job')
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  // Search jobs (Elastic)
  //api/job/search?keyword=abc&sectorId=2&workingShift=AFTERNOON&page=1&limit=10
  @Get("search")
  async search(@Query() q: JobSearchDto) {
    return this.jobService.searchJobs(q);
  }

  @Post(':companyId') // Thêm param vào path
  @ApiOperation({ summary: "Create new job" })
  create(
    @Param('companyId', ParseIntPipe) companyId: number, // Lấy ID từ URL
    @Body() dto: CreateJobRequest
  ) {
    return this.jobService.createJob(dto, companyId);
  }

  // GET JOB DETAIL
  @Get(":id")
  @ApiOperation({ summary: "Get job detail by id" })
  async getDetail(@Param("id", ParseIntPipe) id: number) {
    return this.jobService.getDetail(id);
  }

  @Get(':id/apply-form')
  @ApiOperation({ summary: 'Get apply form by job id' })
  async getApplyForm(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.getApplyForm(id)
  }

  @Get('me/applications')
  @ApiOperation({ summary: 'Get apply history for current user' })
  @ApiBearerAuth('access-token')
  @AuthJwtAccessProtected()
  async getMyApplications(@AuthJwtPayload('userId') userId: number) {
    return this.jobService.getApplicationsByUser(userId)
  }

  @Post(':id/apply')
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
  @ApiOperation({ summary: "Update job" })
  update(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateJobRequest
  ) {
    return this.jobService.updateJob(id, body, companyId);
  }

  // DELETE JOB
  @Delete(':companyId/jobs/:id')
  @ApiOperation({ summary: "Delete job (Soft delete)" })
  async delete(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number
  ) {
    // Không còn fake nữa, lấy trực tiếp từ URL
    return this.jobService.deleteJob(id, companyId);
  }

}
