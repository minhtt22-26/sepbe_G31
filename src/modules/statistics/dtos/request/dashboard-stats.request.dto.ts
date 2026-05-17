import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsOptional } from 'class-validator'

export class DashboardStatsRequestDto {
  @ApiProperty({ description: 'Ngày bắt đầu thống kê', example: '2024-01-01', required: false })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiProperty({ description: 'Ngày kết thúc thống kê', example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  to?: string
}
