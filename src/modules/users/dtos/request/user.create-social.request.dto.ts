import { IsEnum, IsOptional, IsString } from "class-validator";
import { EnumUserRole } from "src/generated/prisma/enums";

export class UserCreateSocialRequestDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    /** Bắt buộc khi tạo tài khoản Google lần đầu; bỏ qua nếu user đã tồn tại */
    @IsOptional()
    @IsEnum(EnumUserRole)
    role?: EnumUserRole;
}