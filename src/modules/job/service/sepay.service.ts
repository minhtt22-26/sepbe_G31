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
    return normalized === expected
  }

  extractOrderIdFromPayload(payload: Record<string, unknown>): number | null {
    const source = [payload.code, payload.content, payload.description]
      .filter((v) => typeof v === 'string')
      .join(' ')

    const prefix = this.paymentCfg.sepayOrderPrefix
    const regex = new RegExp(`${prefix}(\\d+)`, 'i')
    const match = source.match(regex)
    if (!match) {
      return null
    }

    const id = Number(match[1])
    return Number.isFinite(id) && id > 0 ? id : null
  }
}
