import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import paymentConfig from 'src/config/payment.config'
import { PrismaService } from 'src/prisma.service'
import {
  OrderType,
  PaymentMethod,
  PaymentStatus,
  WalletTransactionType,
} from 'src/generated/prisma/enums'

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(paymentConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentConfig>,
  ) {}

  private buildSepayCheckout(orderId: number, amount: number) {
    if (!this.paymentCfg.sepayBankCode || !this.paymentCfg.sepayAccountNumber) {
      throw new Error(
        'SEPAY chưa được cấu hình. Cần SEPAY_BANK_CODE và SEPAY_ACCOUNT_NUMBER.',
      )
    }

    const paymentCode = `${this.paymentCfg.sepayOrderPrefix}${orderId}`
    const qrParams = new URLSearchParams({
      amount: String(amount),
      addInfo: paymentCode,
    })

    if (this.paymentCfg.sepayAccountName) {
      qrParams.set('accountName', this.paymentCfg.sepayAccountName)
    }

    const paymentUrl = `https://img.vietqr.io/image/${encodeURIComponent(
      this.paymentCfg.sepayBankCode,
    )}-${encodeURIComponent(this.paymentCfg.sepayAccountNumber)}-compact2.png?${qrParams.toString()}`

    return {
      paymentCode,
      paymentUrl,
      transferNote: paymentCode,
      bankCode: this.paymentCfg.sepayBankCode,
      accountNumber: this.paymentCfg.sepayAccountNumber,
      accountName: this.paymentCfg.sepayAccountName || null,
    }
  }

  validateWebhookAuthorization(authorizationHeader?: string): boolean {
    const configuredKey = this.paymentCfg.sepayWebhookApiKey?.trim() ?? ''
    if (!configuredKey) {
      return true  // consistent với BOOST JOB handler: không có key → cho qua
    }

    if (!authorizationHeader) {
      return false
    }

    const normalized = authorizationHeader.trim().toLowerCase()
    const expected = `apikey ${configuredKey}`.toLowerCase()
    const expectedKey = configuredKey.toLowerCase()

    return normalized === expected || normalized === expectedKey
  }

  private extractOrderIdFromPayload(payload: Record<string, unknown>): number | null {
    const candidates = [
      payload.code,
      payload.content,
      payload.description,
      payload.transferContent,
      payload.transfer_content,
      payload.addInfo,
      payload.add_info,
      payload.referenceCode,
      payload.reference_code,
      payload.transactionCode,
      payload.transaction_code,
      payload.orderCode,
      payload.order_code,
      payload.memo,
      payload.note,
    ]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)

    const prefix = this.paymentCfg.sepayOrderPrefix.trim()
    const normalizedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(`${normalizedPrefix}\\s*[-_]?\\s*(\\d+)`, 'i'),
      new RegExp(`\\b${normalizedPrefix}(\\d+)\\b`, 'i'),
    ]

    for (const candidate of candidates) {
      for (const pattern of patterns) {
        const match = candidate.match(pattern)
        if (!match) continue

        const id = Number(match[1])
        if (Number.isFinite(id) && id > 0) {
          return id
        }
      }
    }
    return null
  }

  async ensureCompanyWallet(companyId: number) {
    return this.prisma.companyWallet.upsert({
      where: { companyId },
      update: {},
      create: { companyId },
    })
  }

  async getCompanyWallet(companyId: number) {
    return this.ensureCompanyWallet(companyId)
  }

  async getPointCost(settingKey: string, fallback: number) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: settingKey },
      select: { value: true },
    })
    if (!setting?.value) return fallback

    const parsed = Number(setting.value)
    if (!Number.isFinite(parsed) || parsed < 0) return fallback
    return Math.floor(parsed)
  }

  async getPointPricing() {
    const keys = [
      'JOB_POST_POINT_COST',
      'BOOST_JOB_POINT_COST',
      'BOOST_JOB_DURATION_DAYS',
      'AI_INVITE_POINT_COST_PER_WORKER',
    ]
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    })
    const map = new Map(settings.map((item) => [item.key, Number(item.value)]))
    return {
      JOB_POST_POINT_COST: map.get('JOB_POST_POINT_COST') ?? 50000,
      BOOST_JOB_POINT_COST: map.get('BOOST_JOB_POINT_COST') ?? 50000,
      BOOST_JOB_DURATION_DAYS: map.get('BOOST_JOB_DURATION_DAYS') ?? 7,
      AI_INVITE_POINT_COST_PER_WORKER:
        map.get('AI_INVITE_POINT_COST_PER_WORKER') ?? 1000,
    }
  }

  async getActiveBoostPackages() {
    return this.prisma.paymentPackage.findMany({
      where: {
        orderType: OrderType.BOOST_JOB,
        isActive: true,
        durationDays: { not: null },
      },
      orderBy: [
        { isDefault: 'desc' },
        { durationDays: 'asc' },
        { price: 'asc' },
        { createdAt: 'asc' },
      ],
    })
  }

  async getBoostPackagesForEmployer() {
    const packages = await this.getActiveBoostPackages()
    const mappedPackages = packages.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      durationDays: Number(item.durationDays || 1),
      price: Number(item.price || 0),
      isDefault: Boolean(item.isDefault),
    }))

    const fallbackDays = await this.getPointCost('BOOST_JOB_DURATION_DAYS', 7)
    const fallbackPrice = await this.getPointCost('BOOST_JOB_POINT_COST', 50000)
    const normalizedFallbackDays = Math.max(1, fallbackDays)
    const normalizedFallbackPrice = Math.max(0, fallbackPrice)

    const hasFallbackDuration = mappedPackages.some(
      (item) => Number(item.durationDays) === normalizedFallbackDays,
    )

    // Keep compatibility for environments where DB currently has only one boost tier.
    if (!hasFallbackDuration) {
      mappedPackages.unshift({
        id: 0,
        name: `Gói đẩy tin ${normalizedFallbackDays} ngày`,
        description: 'Gói mặc định theo cấu hình điểm hệ thống.',
        durationDays: normalizedFallbackDays,
        price: normalizedFallbackPrice,
        isDefault: !mappedPackages.some((item) => item.isDefault),
      })
    }

    if (mappedPackages.length > 0) {
      return mappedPackages
    }

    return [
      {
        id: 0,
        name: `Gói đẩy tin ${normalizedFallbackDays} ngày`,
        description: 'Gói mặc định theo cấu hình điểm hệ thống.',
        durationDays: normalizedFallbackDays,
        price: normalizedFallbackPrice,
        isDefault: true,
      },
    ]
  }

  async resolveBoostPackage(packageDays?: number) {
    const packages = await this.getBoostPackagesForEmployer()
    if (!packages.length) {
      throw new BadRequestException('Không tìm thấy gói đẩy tin hợp lệ')
    }

    if (packageDays !== undefined && packageDays !== null) {
      const matched = packages.find(
        (item) => Number(item.durationDays) === Number(packageDays),
      )
      if (!matched) {
        throw new BadRequestException(
          'Gói đẩy tin đã chọn không tồn tại hoặc đã ngừng hoạt động',
        )
      }
      return matched
    }

    const defaultPkg = packages.find((item) => item.isDefault)
    return defaultPkg || packages[0]
  }

  async createTopupCheckout(companyId: number, amountVnd: number, userId: number) {
    if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
      throw new BadRequestException('Số tiền nạp không hợp lệ')
    }

    await this.ensureCompanyWallet(companyId)

    const amount = Math.floor(amountVnd)
    const pointAmount = amount
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        orderType: OrderType.TOPUP_WALLET,
        targetId: companyId,
        amount,
        pointAmount,
        paymentMethod: PaymentMethod.SEPAY,
        status: PaymentStatus.PENDING,
      },
    })

    const checkout = this.buildSepayCheckout(order.id, amount)
    return {
      paymentOrderId: order.id,
      amount,
      pointAmount,
      ...checkout,
    }
  }

  async getTopupOrderStatus(orderId: number, companyId: number, userId: number) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        targetId: true,
        orderType: true,
        status: true,
        amount: true,
        pointAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!order || order.orderType !== OrderType.TOPUP_WALLET) {
      throw new BadRequestException('Không tìm thấy đơn nạp điểm')
    }

    if (order.userId !== userId || order.targetId !== companyId) {
      throw new UnauthorizedException('Bạn không có quyền xem đơn nạp này')
    }

    const wallet = await this.ensureCompanyWallet(companyId)

    return {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      pointAmount: order.pointAmount ?? order.amount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      walletBalancePoint: wallet.balancePoint,
    }
  }

  async processTopupWebhookPayload(payload?: Record<string, unknown>): Promise<{
    success: boolean
    message: string
    data?: { paymentOrderId: number; companyId: number; pointAmount: number }
  }> {
    this.logger.debug(`[PAYLOAD] raw: ${JSON.stringify(payload)}`)

    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Payload webhook không hợp lệ')
    }

    const normalizedPayload =
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : payload

    const transferType =
      typeof normalizedPayload.transferType === 'string'
        ? normalizedPayload.transferType.toLowerCase()
        : typeof normalizedPayload.transfer_type === 'string'
          ? normalizedPayload.transfer_type.toLowerCase()
          : ''
    this.logger.debug(`[PAYLOAD] transferType="${transferType}"`)
    if (transferType && !transferType.startsWith('in')) {
      this.logger.warn(`[PAYLOAD] Skipped — not incoming transfer (transferType="${transferType}")`)
      return { success: true, message: 'Bỏ qua giao dịch không phải tiền vào' }
    }

    const orderId = this.extractOrderIdFromPayload(normalizedPayload)
    this.logger.debug(`[PAYLOAD] extracted orderId=${orderId} from content="${String(normalizedPayload.content)}" code="${String(normalizedPayload.code)}"`)
    if (!orderId) {
      this.logger.warn(`[PAYLOAD] Skipped — no valid orderId. prefix="${this.paymentCfg.sepayOrderPrefix}" content="${String(normalizedPayload.content)}" code="${String(normalizedPayload.code)}"`)
      return { success: true, message: 'Bỏ qua giao dịch không chứa mã hợp lệ' }
    }

    const order = await this.prisma.paymentOrder.findUnique({ where: { id: orderId } })
    this.logger.debug(`[PAYLOAD] order #${orderId}: ${order ? `type=${order.orderType} status=${order.status} amount=${order.amount}` : 'NOT FOUND'}`)
    if (!order || order.orderType !== OrderType.TOPUP_WALLET) {
      this.logger.warn(`[PAYLOAD] Skipped — order #${orderId} not found or wrong type`)
      return { success: true, message: 'Không tìm thấy order nạp ví tương ứng' }
    }
    if (order.status === PaymentStatus.COMPLETED) {
      this.logger.warn(`[PAYLOAD] Skipped — order #${orderId} already completed`)
      return { success: true, message: 'Order đã xử lý trước đó' }
    }

    const transferAmount = Number(
      normalizedPayload.transferAmount ??
        normalizedPayload.transfer_amount ??
        normalizedPayload.amount ??
        normalizedPayload.amount_in ??
        0,
    )
    this.logger.debug(`[PAYLOAD] transferAmount=${transferAmount} vs order.amount=${order.amount}`)
    if (!Number.isFinite(transferAmount) || transferAmount < order.amount) {
      this.logger.warn(`[PAYLOAD] Skipped — transferAmount=${transferAmount} < order.amount=${order.amount}`)
      return { success: true, message: 'Số tiền chưa đủ để nạp điểm' }
    }

    const transactionCode =
      (typeof normalizedPayload.referenceCode === 'string'
        ? normalizedPayload.referenceCode
        : typeof normalizedPayload.reference_code === 'string'
          ? normalizedPayload.reference_code
          : null) ||
      (typeof normalizedPayload.transactionCode === 'string'
        ? normalizedPayload.transactionCode
        : typeof normalizedPayload.transaction_code === 'string'
          ? normalizedPayload.transaction_code
          : null) ||
      String(order.id)

    const companyId = order.targetId
    if (!companyId) {
      throw new BadRequestException('Order nạp ví không có companyId')
    }

    const pointAmount = order.pointAmount ?? order.amount
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.companyWallet.upsert({
        where: { companyId },
        update: {},
        create: { companyId },
      })

      const nextBalance = wallet.balancePoint + pointAmount

      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentStatus.COMPLETED,
          transactionCode,
        },
      })

      await tx.companyWallet.update({
        where: { id: wallet.id },
        data: {
          balancePoint: nextBalance,
          totalTopupPoint: { increment: pointAmount },
        },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.TOPUP,
          pointDelta: pointAmount,
          balanceAfter: nextBalance,
          referenceType: 'PAYMENT_ORDER',
          referenceId: order.id,
          metadata: {
            transactionCode,
            amountVnd: order.amount,
          },
        },
      })

      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Thanh toán nạp điểm thành công',
          message: `Đã cộng ${pointAmount.toLocaleString('vi-VN')} điểm vào ví của bạn.`,
          link: '/employer/wallet?walletTopupSuccess=1',
        },
      })
    })

    this.logger.log(`[PAYLOAD] ✓ Topup SUCCESS — order #${order.id} company #${companyId} +${pointAmount} points`)
    return {
      success: true,
      message: 'Nạp điểm thành công',
      data: {
        paymentOrderId: order.id,
        companyId,
        pointAmount,
      },
    }
  }

  async processTopupWebhook(
    authorizationHeader?: string,
    payload?: Record<string, unknown>,
  ) {
    if (!this.validateWebhookAuthorization(authorizationHeader)) {
      throw new UnauthorizedException('SePay webhook authorization không hợp lệ')
    }
    return this.processTopupWebhookPayload(payload)
  }

  async deductPoints(params: {
    companyId: number
    cost: number
    type: WalletTransactionType
    referenceType: string
    referenceId?: number
    metadata?: Record<string, unknown>
  }) {
    if (params.cost <= 0) {
      return
    }

    await this.prisma.$transaction(async (tx) => {
      // Ensure wallet row exists before atomic update
      await tx.companyWallet.upsert({
        where: { companyId: params.companyId },
        update: {},
        create: { companyId: params.companyId },
      })

      // Atomic deduction — single UPDATE with WHERE prevents race conditions
      const [wallet] = await tx.$queryRaw<{ id: number; balancePoint: number }[]>`
        UPDATE "CompanyWallet"
        SET
          "balancePoint"    = "balancePoint" - ${params.cost},
          "totalSpentPoint" = "totalSpentPoint" + ${params.cost},
          "updatedAt"       = now()
        WHERE "companyId" = ${params.companyId}
          AND "balancePoint" >= ${params.cost}
        RETURNING id, "balancePoint"
      `

      if (!wallet) {
        throw new BadRequestException('Số dư điểm không đủ')
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: params.type,
          pointDelta: -params.cost,
          balanceAfter: wallet.balancePoint,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          metadata: (params.metadata ?? undefined) as any,
        },
      })
    })
  }

  async getWalletTransactions(companyId: number, page = 1, limit = 20) {
    const wallet = await this.ensureCompanyWallet(companyId)
    const safePage = page > 0 ? page : 1
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const skip = (safePage - 1) * safeLimit

    const [items, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ])

    return {
      wallet,
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPage: Math.ceil(total / safeLimit),
      },
    }
  }
}
