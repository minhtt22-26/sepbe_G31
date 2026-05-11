import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator'
import { PaymentMethod } from 'src/generated/prisma/enums'

export class BoostCheckoutRequestDto {
  @ApiPropertyOptional({
    description: 'Thời hạn boost (ngày)',
    enum: [7, 30],
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packageDays?: number

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán',
    enum: PaymentMethod,
    default: PaymentMethod.SEPAY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod

  @ApiPropertyOptional({
    description: 'Số tiền thanh toán (VND). Nếu bỏ trống sẽ tự tính theo gói',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amount?: number
}
