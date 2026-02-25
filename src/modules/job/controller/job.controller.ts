import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { JobService } from "../service/job.service";
import { JobSearchDto } from "../dtos/job.search.request.dto";
import { JobCreateRequestDto } from "../dtos/job.create.request.dto";
import { JobUpdateRequestDto } from "../dtos/job.update.request.dto";
@ApiTags("Job")
@Controller("job")
export class JobController {
  constructor(private readonly jobService: JobService) { }

  // Search jobs (Elastic)
  //api/job/search?keyword=abc&sectorId=2&workingShift=AFTERNOON&page=1&limit=10
  @Get("search")
  async search(@Query() q: JobSearchDto) {
    return this.jobService.searchJobs(q);
  }

  // GET JOB DETAIL
  @Get(":id")
  @ApiOperation({ summary: "Get job detail by id" })
  async getDetail(@Param("id", ParseIntPipe) id: number) {
    return this.jobService.getDetail(id);
  }

  // CREATE JOB
  @Post()
  @ApiOperation({ summary: "Create new job" })
  async create(
    @Body() dto: JobCreateRequestDto
  ) {
    // lấy companyId từ JWT sau này
    const fakeCompanyId = 1;

    return this.jobService.createJob(dto, fakeCompanyId);
  }

  // UPDATE JOB
  @Put(":id")
  @ApiOperation({ summary: "Update job" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: JobUpdateRequestDto
  ) {
    const fakeCompanyId = 1;

    return this.jobService.updateJob(id, dto, fakeCompanyId);
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