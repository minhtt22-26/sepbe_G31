import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { CreateCampaignSlotRequestDto } from './create-campaign-slot.request.dto'

export class CreateCampaignRequestDto {
  @ApiProperty({
    description: 'Tên chiến dịch mời phỏng vấn (legacy, sẽ được hệ thống tự sinh)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string

  @ApiProperty({ description: 'Mô tả chiến dịch (legacy)', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string

  @ApiProperty({
    description: 'Nội dung tin nhắn gửi đến worker (legacy, sẽ dùng template hệ thống)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  message?: string

  @ApiProperty({ description: 'ID công việc liên quan (tùy chọn)', required: false })
  @IsInt()
  @IsOptional()
  jobId?: number

  @ApiProperty({ description: 'ID danh sách worker được mời', example: [1, 2, 3, 4, 5] })
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  workerIds: number[]

  @ApiProperty({
    description: 'Danh sách ca phỏng vấn để worker lựa chọn',
    type: [CreateCampaignSlotRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignSlotRequestDto)
  slots: CreateCampaignSlotRequestDto[]

  @ApiProperty({ 
    description: 'Thời gian hết hạn đổi lịch (ISO format)', 
    example: '2024-12-31T23:59:59Z',
    required: false 
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string

  @ApiProperty({
    description: 'Thời gian gửi dự kiến (legacy)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string
}
