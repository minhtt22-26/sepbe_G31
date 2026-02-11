import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import {  EnumShift, EnumUserGender } from "src/generated/prisma/enums";

export class WorkerProfileRequestDto {

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    sectorId?: number

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    occupationId?: number

    @IsString()
    @IsOptional()
    address?: string

    @IsString()
    @IsOptional()
    province?: string

    @IsString()
    @IsOptional()
    district?: string

    @IsArray()
    @IsEnum(EnumShift, { each: true })
    shift: EnumShift[]

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
    @Max(100_000_000)
    expectedSalaryMax?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(80)
    experienceYear?: number

}