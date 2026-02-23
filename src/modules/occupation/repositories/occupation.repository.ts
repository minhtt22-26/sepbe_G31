import { Injectable } from '@nestjs/common'
import { SectorStatus } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class OccupationRepository {
    constructor(private readonly prisma: PrismaService) { }

    /** Lấy tất cả ngành đang ACTIVE, kèm danh sách nghề bên trong */
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

    /** Lấy danh sách nghề theo ngành */
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
