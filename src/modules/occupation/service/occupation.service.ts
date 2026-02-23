import { Injectable } from '@nestjs/common'
import { OccupationRepository } from '../repositories/occupation.repository'

@Injectable()
export class OccupationService {
    constructor(private readonly occupationRepository: OccupationRepository) { }

    async getSectorsWithOccupations() {
        return this.occupationRepository.findAllSectorsWithOccupations()
    }

    async getOccupationsBySector(sectorId: number) {
        return this.occupationRepository.findOccupationsBySector(sectorId)
    }
}
