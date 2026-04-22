import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

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

  @ApiProperty({ description: 'Trang du lieu lich su giao dich', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({ description: 'So ban ghi moi trang', example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10
}
