import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UserLoginRequestDto {
    @IsString()
    @IsOptional()
    userName?: string

    @IsString()
    @IsOptional()
    @IsEmail()
    email?: string

    @IsString()
    @IsNotEmpty()
    password: string
}