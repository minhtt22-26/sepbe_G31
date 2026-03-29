import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsEnum } from 'class-validator'

export enum PaymentGroupByEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class PaymentStatsRequestDto {
  @ApiProperty({ description: 'Ngày bắt đầu thống kê', example: '2024-01-01' })
  @IsDateString()
  from: string

  @ApiProperty({ description: 'Ngày kết thúc thống kê', example: '2024-12-31' })
  @IsDateString()
  to: string

  @ApiProperty({
    description: 'Nhóm theo ngày, tuần, tháng, năm',
    enum: PaymentGroupByEnum,
    example: PaymentGroupByEnum.MONTH,
  })
  @IsEnum(PaymentGroupByEnum)
  groupBy: PaymentGroupByEnum
}
