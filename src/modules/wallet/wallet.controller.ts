import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger'
import { WalletService } from './wallet.service'
import { CompanyService } from '../company/company.service'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
  AuthRoleProtected,
} from '../auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly companyService: CompanyService,
  ) {}

  @Get('me')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy ví point của employer' })
  async getMyWallet(@AuthJwtPayload() user: any) {
    const company = await this.companyService.findByOwnerId(user.userId)
    const wallet = await this.walletService.getCompanyWallet(company.id)
    return { success: true, data: wallet }
  }

  @Get('pricing')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy bảng giá point cho employer' })
  async getPointPricing() {
    const pricing = await this.walletService.getPointPricing()
    return { success: true, data: pricing }
  }

  @Get('transactions')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy lịch sử giao dịch point' })
  async getTransactions(
    @AuthJwtPayload() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    const result = await this.walletService.getWalletTransactions(
      company.id,
      Number(page) || 1,
      Number(limit) || 20,
    )
    return { success: true, ...result }
  }

  @Post('topup/checkout')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo QR nạp point vào ví' })
  async createTopupCheckout(
    @AuthJwtPayload() user: any,
    @Body() body: { amount: number },
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount không hợp lệ')
    }

    const data = await this.walletService.createTopupCheckout(
      company.id,
      amount,
      user.userId,
    )
    return { success: true, data }
  }

  @Post('topup/sepay/webhook')
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiHeader({
    name: 'authorization',
    required: true,
    description: 'SePay webhook auth header. Format: apikey <SEPAY_WEBHOOK_API_KEY>',
  })
  @ApiOperation({ summary: 'SePay webhook callback for wallet topup' })
  async handleTopupWebhook(
    @Headers('authorization') authorization?: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.walletService.processTopupWebhook(authorization, body)
  }
}
