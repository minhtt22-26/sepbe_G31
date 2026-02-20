import { Injectable } from '@nestjs/common';
import { RepositoryService } from '../repositories/repository.service';
// import { IJobSearch } from '../interfaces/job.interface';
import { JobStatus } from 'src/generated/prisma/enums';
import { title } from 'process';
import { contains } from 'class-validator';
import { equal } from 'assert';
// import { ElasticService } from 'src/modules/elastic/elastic/elastic.service';

@Injectable()
export class JobService {
    constructor(
        private readonly RepositoryService: RepositoryService,
        // private readonly elastic: ElasticService
    ) { }
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
        const now = new Date();
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
        const { items, total } = await this.RepositoryService.searchJobs
            (where, orderBy, limit, skip)

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
    // async testElastic() {
    //     return this.elastic.client.info();
    //   }


}
