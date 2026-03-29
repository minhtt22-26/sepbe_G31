import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ConfirmBoostPaymentRequestDto {
  @ApiProperty({ description: 'ID đơn thanh toán boost' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentOrderId!: number

  @ApiProperty({
    required: false,
    description: 'Mã giao dịch từ cổng thanh toán (nếu có)',
  })
  @IsOptional()
  @IsString()
  transactionCode?: string
}
