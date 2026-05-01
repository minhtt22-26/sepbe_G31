import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class SectorListQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Trang (bắt đầu 1). Có `page` thì trả về phân trang.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ example: 10, description: 'Số bản ghi / trang (1–100), mặc định 10 khi có `page`' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number
}
