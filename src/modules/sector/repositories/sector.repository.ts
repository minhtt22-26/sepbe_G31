import { Injectable } from '@nestjs/common'
import { SectorStatus } from 'src/generated/prisma/enums'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class SectorRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.sector.findMany({
            where: {
                status: SectorStatus.ACTIVE,
            },
            orderBy: {
                name: 'asc',
            },
        })
    }

    async findById(id: number) {
        return this.prisma.sector.findFirst({
            where: {
                id,
                status: SectorStatus.ACTIVE,
            },
        })
    }

    async findByName(name: string) {
        return this.prisma.sector.findUnique({
            where: {
                name,
            },
        })
    }

    async create(name: string) {
        return this.prisma.sector.create({
            data: {
                name,
                status: SectorStatus.ACTIVE,
            },
        })
    }

    async update(id: number, name: string) {
        return this.prisma.sector.update({
            where: {
                id,
            },
            data: {
                name,
            },
        })
    }

    async softDelete(id: number) {
        return this.prisma.sector.update({
            where: {
                id,
            },
            data: {
                status: SectorStatus.DELETED,
            },
        })
    }
}
