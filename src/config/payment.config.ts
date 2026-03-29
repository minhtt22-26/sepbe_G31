import { registerAs } from '@nestjs/config'

export default registerAs('payment', () => ({
  sepayWebhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY ?? '',
  sepayBankCode: process.env.SEPAY_BANK_CODE ?? '',
  sepayAccountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? '',
  sepayAccountName: process.env.SEPAY_ACCOUNT_NAME ?? '',
  sepayOrderPrefix: process.env.SEPAY_ORDER_PREFIX ?? 'BOOST',
}))
