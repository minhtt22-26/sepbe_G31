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
import { SectorService } from '../service/sector.service'
import { CreateSectorRequest } from '../dtos/request/create-sector.request'
import { UpdateSectorRequest } from '../dtos/request/update-sector.request'

@Controller('sectors')
@ApiTags('Sectors')
export class SectorController {
    constructor(private readonly sectorService: SectorService) { }

    @Post()
    @ApiOperation({ summary: 'Create sector' })
    create(@Body() body: CreateSectorRequest) {
        return this.sectorService.create(body)
    }

    @Get()
    @ApiOperation({ summary: 'Get all sectors' })
    findAll() {
        return this.sectorService.findAll()
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get sector detail' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.sectorService.findOne(id)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update sector' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateSectorRequest,
    ) {
        return this.sectorService.update(id, body)
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete sector' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.sectorService.remove(id)
    }
}
