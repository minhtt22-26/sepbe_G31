import { IsNotEmpty, IsString } from "class-validator";

export class AuthRefreshTokenRequestDto {
    @IsString()
    @IsNotEmpty()
    refreshToken: string
}