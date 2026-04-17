import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from 'src/generated/prisma/enums';

export class UpdateReviewReportStatusDto {
  @ApiProperty({
    enum: ReportStatus,
    description: 'Trạng thái mới của báo cáo',
    example: ReportStatus.RESOLVED,
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({
    description: 'Ghi chú của manager',
    example: 'Đã xác minh và ẩn đánh giá',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  managerNote?: string;
}
