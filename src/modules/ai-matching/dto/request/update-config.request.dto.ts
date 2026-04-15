import {
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'
import { MatchingConfigKey } from 'src/generated/prisma/enums'

export class UpdateConfigItemDto {
  @IsEnum(MatchingConfigKey)
  key: MatchingConfigKey

  @IsNumber()
  @Min(0)
  @Max(1)
  value: number
}

export class UpdateConfigsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateConfigItemDto)
  configs: UpdateConfigItemDto[]
}
