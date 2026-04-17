import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ConfirmBoostPaymentRequestDto {
  @ApiProperty({ description: 'ID đơn thanh toán boost' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentOrderId!: number

  @ApiProperty({
    required: true,
    description: 'Mã giao dịch từ cổng thanh toán',
  })
  @IsString()
  @IsNotEmpty()
  transactionCode?: string
}
