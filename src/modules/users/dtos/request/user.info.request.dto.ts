import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UserInfoRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file (JPG/PNG)',
    required: false,
  })
  @IsOptional()
  avatar?: any

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  fullName?: string

  @ApiProperty({
    example: '0912345678',
    description: 'Phone number (VN)',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('VN')
  phone?: string

  @ApiProperty({
    example: 'example@gmail.com',
    description: 'Email address (gửi chuỗi rỗng để xoá email)',
    required: false,
    nullable: true,
  })
  // Chuỗi rỗng -> null để cho phép xoá email; @IsOptional sẽ bỏ qua @IsEmail khi null
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null
}
