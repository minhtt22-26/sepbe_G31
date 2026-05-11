import { Type } from 'class-transformer'
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class ChatGetMessageRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cursor?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20

  /** Lọc tin nhắn theo nội dung (PostgreSQL insensitive). Bỏ qua cursor khi có giá trị. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  search?: string
}
