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
import { ApiOperation } from "@nestjs/swagger";
import { ApplyJobRequest } from '../dtos/request/apply-job.request';
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';

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

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply job with form answers' })
  @AuthJwtAccessProtected()
  async applyJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApplyJobRequest,
    @AuthJwtPayload() user: any,
  ) {
    return this.jobService.applyJob(id, user.userId, body)
  }

  @Patch(':id/cancel-apply')
  @ApiOperation({ summary: 'Cancel applied job' })
  @AuthJwtAccessProtected()
  async cancelApply(
    @Param('id', ParseIntPipe) id: number,
    @AuthJwtPayload() user: any,
  ) {
    return this.jobService.cancelApplyJob(id, user.userId)
  }

  @Put(':id')
  @ApiOperation({ summary: "Update job" })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateJobRequest) {
    const fakeCompanyId = 1;

    return this.jobService.updateJob(id, body, fakeCompanyId);
  }

  // DELETE JOB
  @Delete(":id")
  @ApiOperation({ summary: "Delete job" })
  async delete(
    @Param("id", ParseIntPipe) id: number
  ) {
    const fakeCompanyId = 1;

    return this.jobService.deleteJob(id, fakeCompanyId);
  }

}
