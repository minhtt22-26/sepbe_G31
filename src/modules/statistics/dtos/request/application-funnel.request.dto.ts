import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'

export class ApplicationFunnelRequestDto {
  @ApiProperty({ description: 'ID của công việc', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jobId?: number

  @ApiProperty({ description: 'Ngày bắt đầu thống kê', example: '2024-01-01', required: false })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiProperty({ description: 'Ngày kết thúc thống kê', example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  to?: string
}
