import { Injectable, NotFoundException } from "@nestjs/common"
import { JobRepository } from "../repositories/job.repository";
import { CreateJobRequest } from "../dtos/request/create-job.request";
import { JobResponse } from "../dtos/response/job.response";
import { UpdateJobRequest } from "../dtos/request/update-job.request";
import { RepositoryService } from '../repositories/repository.service';
import { JobStatus } from 'src/generated/prisma/enums';

@Injectable()
export class JobService {
    constructor(private readonly jobRepository: JobRepository, private readonly repositoryService: RepositoryService) { }

    async searchJobs(q: any) {
        const keyword = q.keyword?.trim() || ''
        const province = q.province?.trim() || ''
        const district = q.district
        // const salaryMin = q.salaryMin
        // const salaryMax = q.salaryMax
        const genderRequirement = q.genderRequirement
        // const ageMin = q.ageMin
        // const ageMax = q.ageMax
        const workingShift = q.workingShift
        const occupationId = q.occupationId
        const companyId = q.companyId
        const page = q.page || 1
        const limit = q.limit || 10
        const skip = (page - 1) * limit
        const where: any = {
            status: JobStatus.PUBLISHED
        }
        if (keyword) {
            where.OR = [
                { title: { contains: keyword, mode: "insensitive" } },
                { description: { contains: keyword, mode: "insensitive" } },
            ]
        }
        if (workingShift) {
            where.workingShift = { equals: workingShift }
        }
        if (occupationId) {
            where.occupationId = { equals: Number(occupationId) }
        }
        if (companyId) {
            where.companyId = { equals: Number(companyId) }
        }
        if (province) {
            where.province = { contains: province, mode: "insensitive" }
        }
        if (district) {
            where.district = { contains: district, mode: "insensitive" }
        }
        if (genderRequirement) {
            where.genderRequirement = { equals: genderRequirement }
        }
        // if(salaryMin)
        const sortBy = q.sortBy || "newest"
        const orderBy =
            sortBy === "salary_desc" ? { salaryMax: "desc" }
                : sortBy === "salary_asc" ? { salaryMax: "asc" }
                    : sortBy === "view" ? { viewCount: "desc" } :
                        { createdAt: "desc" }
        const { items, total } = await this.RepositoryService.searchJobs(where, orderBy, limit, skip)
        return {
            success: true,
            items,
            meta: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total / limit)
            }

        }
    }

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
