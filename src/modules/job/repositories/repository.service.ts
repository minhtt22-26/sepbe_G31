import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RepositoryService {
    constructor(private readonly prisma: PrismaService) { }

    async searchJobs(where: any, orderBy: any, limit: number, offset: number) {
        const [items, total] = await this.prisma.$transaction([
            this.prisma.job.findMany({
                where, orderBy, take: limit, skip: offset,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true
                        }
                    }
                }
            }),
            this.prisma.job.count({ where })
        ])
        return { items, total }
    }
}
