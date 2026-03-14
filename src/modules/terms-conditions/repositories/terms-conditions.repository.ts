import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class TermsConditionsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async getLatestTermsConditions() {
        return this.prisma.termsConditions.findFirst({
            orderBy: {
                effectiveAt: 'desc',
            },
        })
    }

    async findById(id: number) {
        return this.prisma.termsConditions.findUnique({
            where: { id },
        })
    }

    async update(id: number, data: { title?: string; content?: string }) {
        return this.prisma.termsConditions.update({
            where: { id },
            data: {
                ...data,
                effectiveAt: new Date(), // Tự động cập nhật effectiveAt sang thời điểm update
            },
        })
    }
}
