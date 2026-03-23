import {
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'
import { MatchingWeightKey } from 'src/generated/prisma/enums'

export class UpdateWeightItemDto {
  @IsEnum(MatchingWeightKey)
  key: MatchingWeightKey

  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number
}

export class UpdateWeightsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWeightItemDto)
  weights: UpdateWeightItemDto[]
}
