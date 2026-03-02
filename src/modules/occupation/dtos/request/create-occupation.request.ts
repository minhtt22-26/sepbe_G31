import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator'

export class CreateOccupationRequest {
    @ApiProperty({ example: 'Công nhân may' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    sectorId: number
}
