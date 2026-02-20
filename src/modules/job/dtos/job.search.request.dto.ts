import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from "class-validator";
import { EnumShift, EnumUserGender } from "src/generated/prisma/enums";

export enum JobSortBy {
  NEWEST = "newest",
  SALARY_DESC = "salary_desc",
  SALARY_ASC = "salary_asc",
  VIEW = "view",
}

export class JobSearchDto {
  @ApiPropertyOptional({
    description: "Keyword tìm kiếm (title/description)",
    example: "công nhân may",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  keyword?: string;

  @ApiPropertyOptional({
    description: "Tỉnh/Thành phố",
    example: "TP. Hồ Chí Minh",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  province?: string;

  @ApiPropertyOptional({
    description: "Quận/Huyện",
    example: "Quận 7",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  district?: string;

  @ApiPropertyOptional({
    description: "Giới tính yêu cầu",
    enum: EnumUserGender,
    example: EnumUserGender.MALE,
  })
  @IsOptional()
  @IsEnum(EnumUserGender)
  genderRequirement?: EnumUserGender;

  @ApiPropertyOptional({
    description: "Ca làm việc",
    enum: EnumShift,
    example: EnumShift.AFTERNOON,
  })
  @IsOptional()
  @IsEnum(EnumShift)
  workingShift?: EnumShift;

  @ApiPropertyOptional({ description: "ID ngành nghề", example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  occupationId?: number;

  @ApiPropertyOptional({ description: "ID công ty", example: 7, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number;

  @ApiPropertyOptional({
    description: "Trang",
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
    description: "Sắp xếp",
    enum: JobSortBy,
    example: JobSortBy.NEWEST,
    default: JobSortBy.NEWEST,
  })
  @IsOptional()
  @IsEnum(JobSortBy)
  sortBy?: JobSortBy;
}
