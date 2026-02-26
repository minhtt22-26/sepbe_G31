import { Injectable, BadRequestException } from "@nestjs/common"
import { JobRepository } from "../repositories/job.repository";
import { CreateJobRequest } from "../dtos/request/create-job.request";
import { UpdateJobRequest } from "../dtos/request/update-job.request";
import { JobStatus } from 'src/generated/prisma/enums';

@Injectable()
export class JobService {
    constructor(private readonly jobRepository: JobRepository) { }

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
        const { items, total } = await this.jobRepository.searchJobs(where, orderBy, limit, skip)
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

    async createJob(
        dto: CreateJobRequest,
        companyId: number
    ) {

        // ==============================
        // 1️⃣ Business Validation
        // ==============================

        if (
            dto.salaryMin != null &&
            dto.salaryMax != null &&
            dto.salaryMin > dto.salaryMax
        ) {
            throw new BadRequestException(
                'salaryMin cannot be greater than salaryMax'
            );
        }

        if (
            dto.ageMin != null &&
            dto.ageMax != null &&
            dto.ageMin > dto.ageMax
        ) {
            throw new BadRequestException(
                'ageMin cannot be greater than ageMax'
            );
        }

        if (
            dto.expiredAt &&
            new Date(dto.expiredAt) < new Date()
        ) {
            throw new BadRequestException(
                'expiredAt must be in the future'
            );
        }

        if (!dto.fields || dto.fields.length === 0) {
            throw new BadRequestException(
                'Job must have at least one form field'
            );
        }

        // ==============================
        // 2️⃣ Prepare Job Data
        // ==============================

        const jobData = {
            title: dto.title,
            description: dto.description,
            occupationId: dto.occupationId,
            workingShift: dto.workingShift,
            quantity: dto.quantity,
            genderRequirement: dto.genderRequirement,
            address: dto.address,
            province: dto.province,
            district: dto.district,
            salaryMin: dto.salaryMin,
            salaryMax: dto.salaryMax,
            ageMin: dto.ageMin,
            ageMax: dto.ageMax,
            expiredAt: dto.expiredAt
                ? new Date(dto.expiredAt)
                : undefined, // hoặc set mặc định 30 ngày nếu muốn

            companyId,
            status: JobStatus.WARNING // hoặc ACTIVE nếu không cần duyệt
        };

        // ==============================
        // 3️⃣ Call Repository
        // ==============================

        const created =
            await this.jobRepository.createJobWithForm({
                jobData,
                fields: dto.fields
            });

        // ==============================
        // 4️⃣ Return Response
        // ==============================

        return {
            success: true,
            data: created
        };
    }

    async updateJob(
        jobId: number,
        dto: UpdateJobRequest,
        companyId: number
    ) {

        const job = await this.jobRepository.findJobById(jobId)

        if (!job || job.companyId !== companyId) {
            throw new Error('Job not found or unauthorized')
        }

        return this.jobRepository.updateJobFull(jobId, dto)
    }

    async getDetail(jobId: number) {
        const job = await this.jobRepository.findJobById(jobId);

        if (!job) {
            throw new Error("Job not found");
        }

        return {
            success: true,
            data: job
        };
    }

    async deleteJob(jobId: number, companyId: number) {

        const job = await this.jobRepository.findJobById(jobId)

        if (!job || job.companyId !== companyId) {
            throw new Error('Job not found or unauthorized')
        }

        await this.jobRepository.deleteJob(jobId)

        return { success: true }
    }


}
