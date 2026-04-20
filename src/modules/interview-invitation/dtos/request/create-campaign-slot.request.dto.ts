import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateCampaignSlotRequestDto {
  @ApiProperty({
    description: 'Thời gian bắt đầu ca phỏng vấn (ISO)',
    example: '2026-04-22T08:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startAt: string

  @ApiProperty({
    description: 'Thời gian kết thúc ca phỏng vấn (ISO)',
    example: '2026-04-22T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endAt: string

  @ApiProperty({
    description: 'Số lượng ứng viên tối đa cho ca',
    example: 5,
  })
  @IsInt()
  @Min(1)
  capacity: number

  @ApiPropertyOptional({
    description: 'Địa điểm phỏng vấn',
    example: 'Văn phòng A - Tầng 3',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string

  @ApiPropertyOptional({
    description: 'Ghi chú cho ca phỏng vấn',
    example: 'Mang theo CCCD và hồ sơ photo',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string
}
