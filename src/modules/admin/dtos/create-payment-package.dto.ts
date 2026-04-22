import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { OrderType } from 'src/generated/prisma/enums'

export class CreatePaymentPackageDto {
  @ApiProperty({ example: 'Goi noi bat 7 ngay' })
  @IsString()
  @MaxLength(120)
  name: string

  @ApiPropertyOptional({ example: 'Tang hien thi tin tuyen dung trong 7 ngay' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string

  @ApiProperty({ enum: OrderType, example: OrderType.BOOST_JOB })
  @IsEnum(OrderType)
  orderType: OrderType

  @ApiPropertyOptional({ example: 7, description: 'So ngay ap dung. Bat buoc voi BOOST_JOB.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number

  @ApiProperty({ example: 50000, description: 'Gia VND' })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  price: number

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: false, description: 'Danh dau goi mac dinh cho order type nay' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean
}
