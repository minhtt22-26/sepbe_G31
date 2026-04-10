import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CampaignStatus } from 'src/generated/prisma/enums'

export class GetCampaignsRequestDto {
  @ApiProperty({ description: 'Trang số', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({ description: 'Số lượng item trên trang', example: 10, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10

  @ApiProperty({ 
    description: 'Lọc theo trạng thái chiến dịch',
    enum: CampaignStatus,
    required: false 
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus
}
