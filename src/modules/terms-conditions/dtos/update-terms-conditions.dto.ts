import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateTermsConditionsDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content?: string;
}
