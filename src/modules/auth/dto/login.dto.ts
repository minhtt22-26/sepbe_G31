import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'test@gmail.com' })
  email: string

  @MinLength(6)
  @ApiProperty({ example: 'password123' })
  password: string
}
