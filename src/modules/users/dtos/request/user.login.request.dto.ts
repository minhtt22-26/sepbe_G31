import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserLoginRequestDto {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ example: 'nguyenvana', description: 'Tên đăng nhập (nếu dùng)' })
    userName?: string

    @IsString()
    @IsOptional()
    @IsEmail()
    @ApiPropertyOptional({ example: 'nguyenvana@example.com', description: 'Email (nếu dùng)' })
    email?: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'P@ssw0rd123', description: 'Mật khẩu' })
    password: string
}