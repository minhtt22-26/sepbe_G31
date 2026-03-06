import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class WishlistRequestDto {


    @ApiPropertyOptional({
        description: 'Trang hiện tại',
        example: 1,
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        description: 'Số lượng mỗi trang',
        example: 10,
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @ApiPropertyOptional({
        description: 'Offset (tự tính từ page nếu không truyền)',
        example: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    skip?: number;
}