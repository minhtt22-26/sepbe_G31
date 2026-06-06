import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { EnumShift, EnumUserGender } from 'src/generated/prisma/enums'

export class WorkerProfileRequestDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  occupationId?: number

  @ApiPropertyOptional({ enum: EnumShift, example: EnumShift.MORNING })
  @IsOptional()
  @IsEnum(EnumShift, { each: true })
  shift?: EnumShift

  @ApiPropertyOptional({ example: 'Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  province?: string

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  ward?: string

  @ApiPropertyOptional({ enum: EnumUserGender })
  @IsOptional()
  @IsEnum(EnumUserGender)
  gender?: EnumUserGender

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear?: number

  @ApiPropertyOptional({ example: 8000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000_000)
  @Max(100_000_000)
  expectedSalary?: number

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYear?: number

  @ApiPropertyOptional({ example: 'Tôi có kinh nghiệm làm việc trong ngành may mặc 2 năm' })
  @IsOptional()
  @IsString()
  bio?: string

  @ApiPropertyOptional({ example: 'Muốn tìm công việc gần nhà, ca sáng, lương ổn định' })
  @IsOptional()
  @IsString()
  desiredJobText?: string
}
