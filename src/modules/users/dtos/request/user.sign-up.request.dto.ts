import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumUserRole } from "src/generated/prisma/enums";

export class UserSignUpRequestDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên đầy đủ' })
    fullName: string

    @ValidateIf(o => !o.email)
    //@IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    @ApiPropertyOptional({ example: 'nguyenvana', description: 'Tên đăng nhập (nếu không dùng email)' })
    userName?: string

    @IsOptional()
    @IsString()
    @IsPhoneNumber()
    @ApiPropertyOptional({ example: '+84901234567', description: 'Số điện thoại (định dạng quốc tế)' })
    phone?: string

    @ValidateIf(o => !o.userName)
    //@IsOptional()
    @IsString()
    @IsEmail()
    @ApiPropertyOptional({ example: 'nguyenvana@example.com', description: 'Email (nếu không dùng userName)' })
    email?: string

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(50)
    @ApiProperty({ example: 'P@ssw0rd123', description: 'Mật khẩu (ít nhất 8 ký tự)' })
    password: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: EnumUserRole.WORKER, enum: EnumUserRole, description: 'Vai trò người dùng' })
    role: EnumUserRole
}