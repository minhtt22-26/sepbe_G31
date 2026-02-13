import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyRegisterDto {
  @ApiProperty({
    example: 'Công ty TNHH ABC Tech',
    description: 'Tên công ty',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '0101234567',
    description: 'Mã số thuế công ty',
  })
  @IsString()
  @IsOptional()
  taxCode?: string;

  @ApiPropertyOptional({
    example: 'Tầng 5, Toà nhà Keangnam, Hà Nội',
    description: 'Địa chỉ công ty',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example:
      'Công ty chuyên phát triển nền tảng tuyển dụng và HR Tech.',
    description: 'Mô tả công ty',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://abctech.vn',
    description: 'Website chính thức',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  // 👇 THÊM 2 FIELD FILE CHO SWAGGER

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Logo công ty (jpg, png)',
  })
  logo?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Giấy phép kinh doanh (pdf, jpg, png)',
  })
  businessLicense?: any;
}
