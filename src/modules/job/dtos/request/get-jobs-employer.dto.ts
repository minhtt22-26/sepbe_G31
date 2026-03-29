import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import { IsInt, IsOptional, Min, Max, IsEnum, IsBoolean } from "class-validator";
import { JobStatus } from "src/generated/prisma/enums";

export class GetJobsByEmployerDto {
  @ApiPropertyOptional({
    description: "Trang hiện tại",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Số lượng mỗi trang",
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "Sử dụng để lấy toàn bộ danh sách (bỏ qua phân trang)",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  fetchAll?: boolean;

  @ApiPropertyOptional({
    description: "Lọc theo trạng thái công việc",
    enum: JobStatus,
    example: JobStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
