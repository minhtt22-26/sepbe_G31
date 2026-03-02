import { Injectable } from '@nestjs/common'
import { SectorStatus } from 'src/generated/prisma/enums'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class OccupationRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.occupation.findMany({
            where: {
                status: SectorStatus.ACTIVE,
            },
            orderBy: {
                name: 'asc',
            },
            select: {
                id: true,
                name: true,
                sectorId: true,
                status: true,
            },
        })
    }

    async findById(id: number) {
        return this.prisma.occupation.findFirst({
            where: {
                id,
                status: SectorStatus.ACTIVE,
            },
            select: {
                id: true,
                name: true,
                sectorId: true,
                status: true,
            },
        })
    }

    async findByNameInSector(name: string, sectorId: number) {
        return this.prisma.occupation.findFirst({
            where: {
                name,
                sectorId,
                status: SectorStatus.ACTIVE,
            },
        })
    }

    async isActiveSector(sectorId: number) {
        const sector = await this.prisma.sector.findFirst({
            where: {
                id: sectorId,
                status: SectorStatus.ACTIVE,
            },
            select: {
                id: true,
            },
        })

        return !!sector
    }

    async create(name: string, sectorId: number) {
        return this.prisma.occupation.create({
            data: {
                name,
                sectorId,
                status: SectorStatus.ACTIVE,
            },
        })
    }

    async update(id: number, name: string, sectorId: number) {
        return this.prisma.occupation.update({
            where: {
                id,
            },
            data: {
                name,
                sectorId,
            },
        })
    }

    async softDelete(id: number) {
        return this.prisma.occupation.update({
            where: {
                id,
            },
            data: {
                status: SectorStatus.DELETED,
            },
        })
    }

    async findAllSectorsWithOccupations() {
        return this.prisma.sector.findMany({
            where: { status: SectorStatus.ACTIVE },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                occupations: {
                    where: { status: SectorStatus.ACTIVE },
                    orderBy: { name: 'asc' },
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        })
    }

    async findOccupationsBySector(sectorId: number) {
        return this.prisma.occupation.findMany({
            where: {
                sectorId,
                status: SectorStatus.ACTIVE,
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            },
        })
    }
}
