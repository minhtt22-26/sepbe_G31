import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { IsSalaryRangeValid } from 'src/common/decorators/salary-range.decorator'
import { EnumShift, EnumUserGender } from 'src/generated/prisma/enums'

export class WorkerProfileRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  occupationId?: number

  @IsOptional()
  @IsEnum(EnumShift, { each: true })
  shift?: EnumShift

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  province?: string

  @IsString()
  @IsOptional()
  district?: string

  @IsOptional()
  @IsEnum(EnumUserGender)
  gender?: EnumUserGender

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000_000)
  @Max(100_000_000)
  expectedSalaryMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000_000)
  @Max(100_000_000)
  @IsSalaryRangeValid()
  expectedSalaryMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYear?: number
}
