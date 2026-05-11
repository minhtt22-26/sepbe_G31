export class PaymentTrendItemDto {
  period: string
  amount: number
}

export class EmployerPaymentTransactionItemDto {
  id: number
  orderType: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  packageDays?: number | null
  packageName?: string | null
  transactionCode?: string | null
  createdAt: string
}

export class PaymentStatsResponseDto {
  totalSpent: number
  trends: PaymentTrendItemDto[]
  transactions: EmployerPaymentTransactionItemDto[]
  meta: {
    page: number
    limit: number
    total: number
    totalPage: number
  }
}
