import { Injectable, NotFoundException } from '@nestjs/common'
import { TermsConditionsRepository } from '../repositories/terms-conditions.repository'
import { UpdateTermsConditionsDto } from '../dtos/update-terms-conditions.dto'

@Injectable()
export class TermsConditionsService {
    constructor(private readonly termsConditionsRepository: TermsConditionsRepository) { }

    async getTermsConditions() {
        const terms = await this.termsConditionsRepository.getLatestTermsConditions()
        if (!terms) {
            throw new NotFoundException('Terms and Conditions not found')
        }
        return terms
    }

    async updateTermsConditions(id: number, data: UpdateTermsConditionsDto) {
        const existing = await this.termsConditionsRepository.findById(id)
        if (!existing) {
            throw new NotFoundException(`Terms and Conditions with ID ${id} not found`)
        }

        return this.termsConditionsRepository.update(id, data)
    }
}
