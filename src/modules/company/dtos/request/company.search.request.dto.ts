import { Transform } from 'class-transformer'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PaginationDto } from 'src/common/dtos/pagination.dto'

export enum CompanySortBy {
  NEWEST = 'newest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

export class CompanySearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  keyword?: string

  @IsOptional()
  @IsEnum(CompanySortBy)
  sortBy?: CompanySortBy = CompanySortBy.NEWEST
}
