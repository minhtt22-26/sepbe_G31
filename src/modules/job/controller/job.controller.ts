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
