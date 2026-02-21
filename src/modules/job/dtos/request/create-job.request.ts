import { IsInt, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { JobStatus, EnumShift, EnumUserGender } from 'src/generated/prisma/enums';

export class CreateJobRequest {
    @IsInt()
    companyId: number;

    @IsInt()
    occupationId: number;

    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsEnum(JobStatus)
    status: JobStatus;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    province?: string;

    @IsOptional()
    @IsString()
    district?: string;

    @IsOptional()
    @IsInt()
    salaryMin?: number;

    @IsOptional()
    @IsInt()
    salaryMax?: number;

    @IsEnum(EnumShift)
    workingShift: EnumShift;

    @IsInt()
    quantity: number;

    @IsOptional()
    @IsEnum(EnumUserGender)
    genderRequirement?: EnumUserGender;

    @IsOptional()
    @IsInt()
    ageMin?: number;

    @IsOptional()
    @IsInt()
    ageMax?: number;

    @IsOptional()
    @IsDateString()
    expiredAt?: Date;
}