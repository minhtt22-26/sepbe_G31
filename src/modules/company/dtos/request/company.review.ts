import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanyStatus } from 'src/generated/prisma/enums';

export class CompanyReviewDto {
  @ApiProperty({
    enum: [CompanyStatus.APPROVED, CompanyStatus.REJECTED],
    example: CompanyStatus.APPROVED,
    description: 'Trạng thái duyệt công ty',
  })
  @IsEnum(CompanyStatus)
  status: CompanyStatus;

  @ApiPropertyOptional({
    example: 'Thiếu giấy phép kinh doanh hợp lệ',
    description: 'Lý do từ chối (bắt buộc khi REJECTED)',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
