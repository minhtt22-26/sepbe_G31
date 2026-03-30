import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { EnumUserRole, EnumUserStatus } from 'src/generated/prisma/enums';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UserListRequestDto {
  @ApiProperty({ example: 1, description: 'Trang hiện tại', required: true })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  page: number;

  @ApiPropertyOptional({ enum: EnumUserRole, description: 'Lọc theo vai trò' })
  @IsOptional()
  @IsEnum(EnumUserRole)
  role?: EnumUserRole;

  @ApiPropertyOptional({ enum: EnumUserStatus, description: 'Lọc theo trạng thái' })
  @IsOptional()
  @IsEnum(EnumUserStatus)
  status?: EnumUserStatus;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z', description: 'Từ ngày' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.999Z', description: 'Đến ngày' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
