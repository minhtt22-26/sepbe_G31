import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordRequestDto {
  @ApiProperty({
    required: true,
    example: 'abc123xyz456',
    description: 'Token từ link reset password',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    required: true,
    example: 'NewPassword@123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}