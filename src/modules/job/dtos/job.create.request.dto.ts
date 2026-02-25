import {
  ApiProperty,
  ApiPropertyOptional
} from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  IsDateString
} from "class-validator";
import { Type } from "class-transformer";
import { EnumShift, EnumUserGender } from "src/generated/prisma/enums";
import { JobFormFieldDto } from "./job.form-field.dto";

export class JobCreateRequestDto {

  @ApiProperty({ example: "Công nhân may" })
  @IsString()
  title: string;

  @ApiProperty({ example: "Mô tả công việc..." })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  occupationId: number;

  @ApiProperty({ enum: EnumShift })
  @IsEnum(EnumShift)
  workingShift: EnumShift;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ enum: EnumUserGender })
  @IsOptional()
  @IsEnum(EnumUserGender)
  genderRequirement?: EnumUserGender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  // ==========================
  // BỔ SUNG PHẦN THIẾU
  // ==========================

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salaryMin?: number;

  @ApiPropertyOptional({ example: 10000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salaryMax?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageMin?: number;

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageMax?: number;

  @ApiPropertyOptional({ example: "2026-12-31T23:59:59.000Z" })
  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  // ==========================
  // GIỮ NGUYÊN PHẦN FORM FIELDS
  // ==========================

  @ApiProperty({
    type: [JobFormFieldDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobFormFieldDto)
  fields: JobFormFieldDto[];
}