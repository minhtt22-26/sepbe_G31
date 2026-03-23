import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class JobRatingDto {
  @ApiProperty({
    example: 5,
    description: 'Overall rating (1-5)',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Môi trường làm việc tốt',
    description: 'Tiêu đề đánh giá',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Chế độ đãi ngộ tốt, đồng nghiệp thân thiện',
    description: 'Nội dung đánh giá chi tiết',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Đánh giá mức lương (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  salaryRating?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Đánh giá môi trường làm việc (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  environmentRating?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Đánh giá OT (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  overtimeRating?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Đánh giá quản lý (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  managementRating?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Đánh giá ẩn danh',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class UpdateJobRatingDto extends PartialType(JobRatingDto) {}
