import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from "class-validator";
import { EnumUserRole } from "src/generated/prisma/enums";

export class UserSignUpRequestDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    fullName: string

    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    userName?: string

    @IsOptional()
    @IsString()
    @IsPhoneNumber()
    phone?: string

    @IsOptional()
    @IsString()
    @IsEmail()
    email?: string

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(50)
    password: string

    @IsString()
    @IsNotEmpty()
    role: EnumUserRole
}