import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator'

export class ApplyJobAnswerRequest {
    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    fieldId: number

    @ApiProperty({ example: 'Nguyễn Văn A - 3 năm kinh nghiệm' })
    @IsString()
    @IsNotEmpty()
    value: string
}

export class ApplyJobRequest {
    @ApiProperty({ type: [ApplyJobAnswerRequest], required: false })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ApplyJobAnswerRequest)
    answers?: ApplyJobAnswerRequest[]
}
