import { IsEmail, IsOptional, IsPhoneNumber, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UserInfoRequestDto {
    @IsOptional()
    @IsUrl()
    avatar?: string

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(30)
    fullName?: string

    @IsOptional()
    @IsPhoneNumber('VN')
    phone?: string

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string
}