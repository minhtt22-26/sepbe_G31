import { Job } from "src/generated/prisma/client";

export class JobResponse {
    id: number;
    title: string;
    description: string;
    status: string;
    province: string | null;
    district: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    quantity: number;
    createdAt: Date;

    constructor(job: Job) {
        this.id = job.id;
        this.title = job.title;
        this.description = job.description;
        this.status = job.status;
        this.province = job.province;
        this.district = job.district;
        this.salaryMin = job.salaryMin;
        this.salaryMax = job.salaryMax;
        this.quantity = job.quantity;
        this.createdAt = job.createdAt;
    }
}