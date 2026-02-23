import { Controller, Get, Query } from "@nestjs/common";
import { JobService } from "../service/job.service";
import { JobSearchDto } from "../dtos/job.search.request.dto";

@Controller("job")
export class JobController {
  constructor(private readonly jobService: JobService) { }

  // Search jobs (Elastic)
  //api/job/search?keyword=abc&sectorId=2&workingShift=AFTERNOON&page=1&limit=10
  @Get("search")
  async search(@Query() q: JobSearchDto) {
    return this.jobService.searchJobs(q);
  }
}