import { Inject, Injectable } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import paymentConfig from 'src/config/payment.config'

@Injectable()
export class SepayService {
  constructor(
    @Inject(paymentConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentConfig>,
  ) {}

  ensureCheckoutConfig() {
    if (!this.paymentCfg.sepayBankCode || !this.paymentCfg.sepayAccountNumber) {
      throw new Error(
        'SEPAY chưa được cấu hình. Cần SEPAY_BANK_CODE và SEPAY_ACCOUNT_NUMBER.',
      )
    }
  }

  buildBoostCheckout(orderId: number, amount: number) {
    this.ensureCheckoutConfig()

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

  isValidWebhookAuthorization(authorizationHeader?: string) {
    if (!this.paymentCfg.sepayWebhookApiKey) {
      return true
    }

    if (!authorizationHeader) {
      return false
    }

    const normalized = authorizationHeader.trim().toLowerCase()
    const expected = `apikey ${this.paymentCfg.sepayWebhookApiKey}`.toLowerCase()
    const expectedKey = this.paymentCfg.sepayWebhookApiKey.trim().toLowerCase()

    return normalized === expected || normalized === expectedKey
  }

  extractOrderIdFromPayload(payload: Record<string, unknown>): number | null {
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
}
