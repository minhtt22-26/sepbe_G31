import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { AuthRoleProtected } from '../auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('statistics')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get overall admin statistics and charts' })
  async getStatistics(@Query('year') year?: string) {
    return this.adminService.getStatistics(
      year ? parseInt(year, 10) : undefined,
    )
  }
}
