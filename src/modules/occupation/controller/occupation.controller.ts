import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'
import { OccupationService } from '../service/occupation.service'

@Controller('occupations')
export class OccupationController {
    constructor(private readonly occupationService: OccupationService) { }

    /**
     * GET /occupations
     * Lấy tất cả ngành kèm danh sách nghề (public, không cần đăng nhập)
     * Dùng để hiển thị dropdown khi worker tạo/cập nhật hồ sơ
     */
    @Get()
    async getSectorsWithOccupations() {
        return this.occupationService.getSectorsWithOccupations()
    }

    /**
     * GET /occupations/sector/:sectorId
     * Lấy danh sách nghề theo ngành (public)
     */
    @Get('sector/:sectorId')
    async getOccupationsBySector(
        @Param('sectorId', ParseIntPipe) sectorId: number,
    ) {
        return this.occupationService.getOccupationsBySector(sectorId)
    }
}
