import { IsNotEmpty, IsString, MaxLength, MinLength, } from "class-validator";

export class UserChangePasswordRequestDto {
    @IsString()
    @IsNotEmpty()
    oldPassword: string

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(50)
    newPassword: string
}