import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SectorService } from '../service/sector.service'
import { CreateSectorRequest } from '../dtos/request/create-sector.request'
import { UpdateSectorRequest } from '../dtos/request/update-sector.request'
import { SectorListQueryDto } from '../dtos/request/sector-list.query'
import { AuthRoleProtected } from 'src/modules/auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'

@Controller('sectors')
@ApiTags('Sectors')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Post()
  @AuthRoleProtected(EnumUserRole.ADMIN)
  @ApiOperation({ summary: 'Create sector' })
  create(@Body() body: CreateSectorRequest) {
    return this.sectorService.create(body)
  }

  @Get()
  @ApiOperation({
    summary:
      'Get all sectors (không query) hoặc phân trang (?page=1&limit=10)',
  })
  findAll(@Query() query: SectorListQueryDto) {
    if (query.page != null) {
      return this.sectorService.findPage(query.page, query.limit)
    }
    return this.sectorService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sector detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sectorService.findOne(id)
  }

  @Patch(':id')
  @AuthRoleProtected(EnumUserRole.ADMIN)
  @ApiOperation({ summary: 'Update sector' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSectorRequest,
  ) {
    return this.sectorService.update(id, body)
  }

  @Delete(':id')
  @AuthRoleProtected(EnumUserRole.ADMIN)
  @ApiOperation({ summary: 'Delete sector' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sectorService.remove(id)
  }
}
