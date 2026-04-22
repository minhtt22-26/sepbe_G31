import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { OrderType } from 'src/generated/prisma/enums'

export class UpdatePaymentPackageDto {
  @ApiPropertyOptional({ example: 'Goi noi bat 7 ngay' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @ApiPropertyOptional({ example: 'Mo ta moi' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string

  @ApiPropertyOptional({ enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  price?: number

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean
}
