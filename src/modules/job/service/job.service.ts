import { Injectable, NotFoundException } from "@nestjs/common"
import { JobRepository } from "../repositories/job.repository";
import { CreateJobRequest } from "../dtos/request/create-job.request";
import { JobResponse } from "../dtos/response/job.response";
import { UpdateJobRequest } from "../dtos/request/update-job.request";


@Injectable()
export class JobService {
  constructor(private readonly jobRepository: JobRepository) { }

  async create(request: CreateJobRequest) {
    const { companyId, occupationId, ...rest } = request;
    const job = await this.jobRepository.create({
      ...rest,
      company: { connect: { id: request.companyId } },
      occupation: { connect: { id: request.occupationId } },
    });

    return new JobResponse(job);
  }

  async findAll() {
    const jobs = await this.jobRepository.findAll();
    return jobs.map((j) => new JobResponse(j));
  }

  async findOne(id: number) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new NotFoundException('Job not found');

    return new JobResponse(job);
  }

  async update(id: number, request: UpdateJobRequest) {
    await this.findOne(id);

    const job = await this.jobRepository.update(id, request);
    return new JobResponse(job);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.jobRepository.delete(id);

    return { message: 'Deleted successfully' };
  }


}
