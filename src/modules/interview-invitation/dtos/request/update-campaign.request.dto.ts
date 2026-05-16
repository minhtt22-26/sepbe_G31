import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { UpdateCampaignSlotRequestDto } from './update-campaign-slot.request.dto'

export class UpdateCampaignRequestDto {
  @ApiProperty({
    description: 'Tên chiến dịch mời phỏng vấn',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string

  @ApiProperty({
    description: 'Nội dung tin nhắn gửi đến worker',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  message?: string

  @ApiProperty({
    description: 'Danh sách ca phỏng vấn để cập nhật',
    type: [UpdateCampaignSlotRequestDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCampaignSlotRequestDto)
  slots: UpdateCampaignSlotRequestDto[]

  @ApiProperty({
    description: 'Thời gian hết hạn đổi lịch (ISO format)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string
}
