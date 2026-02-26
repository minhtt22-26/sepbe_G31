import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ParseIntPipe
} from '@nestjs/common'
import { JobService } from '../service/job.service'
import { CreateJobRequest } from '../dtos/request/create-job.request';
import { UpdateJobRequest } from '../dtos/request/update-job.request';
import { JobSearchDto } from "../dtos/job.search.request.dto";
import { ApiOperation } from "@nestjs/swagger";

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

  @Put(':companyId/jobs/:id') // Cấu trúc: /1/jobs/10
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
