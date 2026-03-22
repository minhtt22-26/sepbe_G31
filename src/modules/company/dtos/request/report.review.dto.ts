import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason } from 'src/generated/prisma/enums';

export class ReportReviewDto {
  @ApiProperty({
    enum: ReportReason,
    description: 'Lý do báo cáo',
    example: ReportReason.INAPPROPRIATE_CONTENT,
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết',
    example: 'Ngôn từ xúc phạm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
