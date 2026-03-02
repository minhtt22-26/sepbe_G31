import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { OccupationRepository } from '../repositories/occupation.repository'
import { CreateOccupationRequest } from '../dtos/request/create-occupation.request'
import { UpdateOccupationRequest } from '../dtos/request/update-occupation.request'

@Injectable()
export class OccupationService {
    constructor(private readonly occupationRepository: OccupationRepository) { }

    async create(body: CreateOccupationRequest) {
        const normalizedName = body.name.trim()
        const isSectorActive = await this.occupationRepository.isActiveSector(body.sectorId)

        if (!isSectorActive) {
            throw new NotFoundException('Sector not found')
        }

        const existed = await this.occupationRepository.findByNameInSector(
            normalizedName,
            body.sectorId,
        )

        if (existed) {
            throw new ConflictException('Occupation name already exists in sector')
        }

        return this.occupationRepository.create(normalizedName, body.sectorId)
    }

    async findAll() {
        return this.occupationRepository.findAll()
    }

    async findOne(id: number) {
        const occupation = await this.occupationRepository.findById(id)

        if (!occupation) {
            throw new NotFoundException('Occupation not found')
        }

        return occupation
    }

    async update(id: number, body: UpdateOccupationRequest) {
        const current = await this.occupationRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Occupation not found')
        }

        const targetSectorId = body.sectorId ?? current.sectorId
        const targetName = body.name?.trim() ?? current.name

        const isSectorActive = await this.occupationRepository.isActiveSector(targetSectorId)

        if (!isSectorActive) {
            throw new NotFoundException('Sector not found')
        }

        const isChanged = targetName !== current.name || targetSectorId !== current.sectorId

        if (isChanged) {
            const existed = await this.occupationRepository.findByNameInSector(
                targetName,
                targetSectorId,
            )

            if (existed && existed.id !== id) {
                throw new ConflictException('Occupation name already exists in sector')
            }
        }

        return this.occupationRepository.update(id, targetName, targetSectorId)
    }

    async remove(id: number) {
        const current = await this.occupationRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Occupation not found')
        }

        await this.occupationRepository.softDelete(id)

        return {
            success: true,
        }
    }

    async getSectorsWithOccupations() {
        return this.occupationRepository.findAllSectorsWithOccupations()
    }

    async getOccupationsBySector(sectorId: number) {
        return this.occupationRepository.findOccupationsBySector(sectorId)
    }
}
