import { IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { EnumUserRole } from "src/generated/prisma/enums";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UserCreateSocialRequestDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsEnum(EnumUserRole)
    @Transform(({ value }) => value || EnumUserRole.WORKER)
    @ApiPropertyOptional({ example: EnumUserRole.WORKER, enum: EnumUserRole, description: 'Vai trò người dùng (mặc định: WORKER)' })
    role: EnumUserRole;
}