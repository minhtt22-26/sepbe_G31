import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { SectorRepository } from '../repositories/sector.repository'
import { CreateSectorRequest } from '../dtos/request/create-sector.request'
import { UpdateSectorRequest } from '../dtos/request/update-sector.request'

@Injectable()
export class SectorService {
    constructor(private readonly sectorRepository: SectorRepository) { }

    async create(body: CreateSectorRequest) {
        const normalizedName = body.name.trim()
        const existed = await this.sectorRepository.findByName(normalizedName)

        if (existed) {
            throw new ConflictException('Sector name already exists')
        }

        return this.sectorRepository.create(normalizedName)
    }

    async findAll() {
        return this.sectorRepository.findAll()
    }

    async findOne(id: number) {
        const sector = await this.sectorRepository.findById(id)

        if (!sector) {
            throw new NotFoundException('Sector not found')
        }

        return sector
    }

    async update(id: number, body: UpdateSectorRequest) {
        const current = await this.sectorRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Sector not found')
        }

        const normalizedName = body.name?.trim()

        if (normalizedName && normalizedName !== current.name) {
            const existed = await this.sectorRepository.findByName(normalizedName)

            if (existed && existed.id !== id) {
                throw new ConflictException('Sector name already exists')
            }
        }

        return this.sectorRepository.update(id, normalizedName ?? current.name)
    }

    async remove(id: number) {
        const current = await this.sectorRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Sector not found')
        }

        await this.sectorRepository.softDelete(id)

        return {
            success: true,
        }
    }
}
