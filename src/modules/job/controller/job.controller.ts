import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common'
import { JobService } from '../service/job.service'
import { CreateJobRequest } from '../dtos/request/create-job.request';
import { UpdateJobRequest } from '../dtos/request/update-job.request';

@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post()
  create(@Body() body: CreateJobRequest) {
    return this.jobService.create(body);
  }

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateJobRequest) {
    return this.jobService.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(Number(id));
  }

}
