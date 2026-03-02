import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { OccupationService } from '../service/occupation.service'
import { CreateOccupationRequest } from '../dtos/request/create-occupation.request'
import { UpdateOccupationRequest } from '../dtos/request/update-occupation.request'

@Controller('occupations')
@ApiTags('Occupations')
export class OccupationController {
    constructor(private readonly occupationService: OccupationService) { }

    @Post()
    @ApiOperation({ summary: 'Create occupation' })
    create(@Body() body: CreateOccupationRequest) {
        return this.occupationService.create(body)
    }

    @Get('grouped-by-sector')
    @ApiOperation({ summary: 'Get sectors with active occupations' })
    async getSectorsWithOccupations() {
        return this.occupationService.getSectorsWithOccupations()
    }

    @Get('sector/:sectorId')
    @ApiOperation({ summary: 'Get active occupations by sector' })
    async getOccupationsBySector(
        @Param('sectorId', ParseIntPipe) sectorId: number,
    ) {
        return this.occupationService.getOccupationsBySector(sectorId)
    }

    @Get()
    @ApiOperation({ summary: 'Get all active occupations' })
    findAll() {
        return this.occupationService.findAll()
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get occupation detail' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.occupationService.findOne(id)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update occupation' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateOccupationRequest,
    ) {
        return this.occupationService.update(id, body)
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete occupation' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.occupationService.remove(id)
    }

}
