import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordRequestDto {
  @ApiProperty({
    required: true,
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}