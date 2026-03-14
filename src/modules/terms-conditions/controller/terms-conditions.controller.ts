import { Controller, Get, Patch, Param, Body, ParseIntPipe } from '@nestjs/common'
import { TermsConditionsService } from '../service/terms-conditions.service'
import { UpdateTermsConditionsDto } from '../dtos/update-terms-conditions.dto'

@Controller('terms-conditions')
export class TermsConditionsController {
    constructor(private readonly termsConditionsService: TermsConditionsService) { }

    @Get()
    async getTermsConditions() {
        return this.termsConditionsService.getTermsConditions()
    }

    @Patch(':id')
    async updateTermsConditions(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTermsConditionsDto
    ) {
        return this.termsConditionsService.updateTermsConditions(id, dto)
    }
}
