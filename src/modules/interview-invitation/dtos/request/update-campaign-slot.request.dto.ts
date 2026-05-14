import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional } from 'class-validator'
import { CreateCampaignSlotRequestDto } from './create-campaign-slot.request.dto'

export class UpdateCampaignSlotRequestDto extends CreateCampaignSlotRequestDto {
  @ApiPropertyOptional({
    description: 'ID của ca phỏng vấn (nếu có thì là cập nhật, nếu không có là tạo mới)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  id?: number
}
