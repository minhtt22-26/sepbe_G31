import { IsEmail, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({
    example: 'test@gmail.com',
    description: 'User email',
  })
  @IsEmail()
  email: string

  @ApiProperty({
    example: '123456',
    minLength: 6,
    description: 'User password',
  })
  @MinLength(6)
  password: string
}
