import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { AuthRoleProtected } from '../auth/decorators/auth.jwt.decorator'
import { EnumUserRole, OrderType } from 'src/generated/prisma/enums'
import { CreatePaymentPackageDto } from './dtos/create-payment-package.dto'
import { UpdatePaymentPackageDto } from './dtos/update-payment-package.dto'

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

  @Get('payment-packages')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get payment packages' })
  async getPaymentPackages(
    @Query('orderType') orderType?: OrderType,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.adminService.getPaymentPackages({
      orderType,
      includeInactive: includeInactive === 'true',
    })
  }

  @Post('payment-packages')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a payment package' })
  async createPaymentPackage(@Body() body: CreatePaymentPackageDto) {
    return this.adminService.createPaymentPackage(body)
  }

  @Patch('payment-packages/:id')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update payment package (price, status, metadata)' })
  async updatePaymentPackage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentPackageDto,
  ) {
    return this.adminService.updatePaymentPackage(id, body)
  }

  @Get('point-pricing')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get point pricing settings for employer actions' })
  async getPointPricingSettings() {
    return this.adminService.getPointPricingSettings()
  }

  @Patch('point-pricing')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update point pricing settings for employer actions' })
  async updatePointPricingSettings(
    @Body()
    body: {
      JOB_POST_POINT_COST: number
      BOOST_JOB_POINT_COST: number
      BOOST_JOB_DURATION_DAYS: number
      AI_INVITE_POINT_COST_PER_WORKER: number
    },
  ) {
    return this.adminService.updatePointPricingSettings(body)
  }
}
