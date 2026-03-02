import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateSectorRequest {
    @ApiProperty({ example: 'Sản xuất' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string
}
