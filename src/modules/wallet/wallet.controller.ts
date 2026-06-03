import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger'
import { WalletService } from './wallet.service'
import { CompanyService } from '../company/company.service'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
  AuthRoleProtected,
} from '../auth/decorators/auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { PaymentQueueService } from 'src/infrastructure/queue/payment/service/payment-queue.service'

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name)

  constructor(
    private readonly walletService: WalletService,
    private readonly companyService: CompanyService,
    private readonly paymentQueueService: PaymentQueueService,
    private readonly configService: ConfigService,
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

  @Get('topup/orders/:orderId/status')
  @AuthJwtAccessProtected()
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Kiểm tra trạng thái đơn nạp point' })
  async getTopupOrderStatus(
    @AuthJwtPayload() user: any,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const company = await this.companyService.findByOwnerId(user.userId)
    const data = await this.walletService.getTopupOrderStatus(
      orderId,
      company.id,
      user.userId,
    )
    return { success: true, data }
  }

  @Post('topup/sepay/webhook')
  @HttpCode(200)
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
  @ApiOperation({ summary: 'SePay webhook callback for wallet topup (async queue processing)' })
  async handleTopupWebhook(
    @Headers('authorization') authorization?: string,
    @Body() body?: Record<string, unknown>,
  ) {
    this.logger.log(`[WEBHOOK] Received — auth: "${authorization ?? '(none)'}" body: ${JSON.stringify(body)}`)

    if (!this.walletService.validateWebhookAuthorization(authorization)) {
      this.logger.warn(`[WEBHOOK] Auth FAILED — received header: "${authorization ?? '(none)'}"`)
      throw new UnauthorizedException('SePay webhook authorization không hợp lệ')
    }

    this.logger.log('[WEBHOOK] Auth OK — queuing job')
    await this.paymentQueueService.queueTopupWebhook({
      gateway: 'SEPAY',
      payload: body ?? {},
    })
    this.logger.log('[WEBHOOK] Job queued successfully')
    return { success: true, message: 'Webhook đã được tiếp nhận và đang xử lý' }
  }

  @Post('topup/dev-simulate/:orderId')
  @HttpCode(200)
  @ApiOperation({ summary: '[DEV ONLY] Giả lập webhook thanh toán thành công cho orderId' })
  async devSimulateWebhook(@Param('orderId', ParseIntPipe) orderId: number) {
    if (this.configService.get('NODE_ENV') !== 'development') {
      throw new BadRequestException('Endpoint này chỉ dùng trong môi trường development')
    }
    this.logger.warn(`[DEV-SIMULATE] Giả lập webhook cho orderId=${orderId}`)
    const result = await this.walletService.processTopupWebhookPayload({
      content: `DEV_SIMULATE SEVQR${orderId}`,
      transferType: 'in',
      transferAmount: 999999999,
      referenceCode: `DEV-SIM-${orderId}`,
    })
    this.logger.warn(`[DEV-SIMULATE] Kết quả: ${JSON.stringify(result)}`)
    return result
  }
}
