import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { CreateCampaignSlotRequestDto } from './create-campaign-slot.request.dto'

export class CreateCampaignRequestDto {
  @ApiProperty({ description: 'Tên chiến dịch mời phỏng vấn', example: 'Mời phỏng vấn công nhân lắp ráp' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string

  @ApiProperty({ description: 'Mô tả chiến dịch', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string

  @ApiProperty({ 
    description: 'Nội dung tin nhắn gửi đến worker', 
    example: 'Chúng tôi rất muốn mời bạn phỏng vấn vị trí công nhân lắp ráp...' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message: string

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
    description: 'Thời gian hết hạn phản hồi (ISO format)', 
    example: '2024-12-31T23:59:59Z',
    required: false 
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string

  @ApiProperty({ 
    description: 'Thời gian gửi dự kiến (ISO format). Nếu không có, sẽ gửi ngay lập tức',
    example: '2024-12-25T10:00:00Z',
    required: false 
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string
}
