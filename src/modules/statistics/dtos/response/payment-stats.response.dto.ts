export class PaymentTrendItemDto {
  period: string
  amount: number
}

export class PaymentStatsResponseDto {
  totalSpent: number
  trends: PaymentTrendItemDto[]
}
