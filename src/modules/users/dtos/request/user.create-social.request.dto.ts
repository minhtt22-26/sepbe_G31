import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EnumUserRole } from "src/generated/prisma/enums";

export class UserCreateSocialRequestDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    @IsString()
    @IsNotEmpty()
    role: EnumUserRole
}