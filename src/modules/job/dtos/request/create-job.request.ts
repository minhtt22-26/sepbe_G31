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
import { JobFormFieldDto } from "../job.form-field.dto";
//import { JobFormFieldDto } from "../job.form-field.dto";

export class CreateJobRequest {

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

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsInt()
    ageMin?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsInt()
    ageMax?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsInt()
    salaryMin?: number;

    @ApiPropertyOptional()
    @Type(() => Number)
    @IsInt()
    salaryMax?: number;

    @ApiPropertyOptional({ example: "2026-12-31T23:59:59.000Z" })
    @IsOptional()
    @IsDateString()
    expiredAt?: string;


    @ApiProperty({
        type: [JobFormFieldDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => JobFormFieldDto)
    fields: JobFormFieldDto[];
}