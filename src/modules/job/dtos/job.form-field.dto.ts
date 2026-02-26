import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class JobFormFieldDto {

  @ApiPropertyOptional({
    description: "ID field (chỉ dùng khi update)",
    example: 12
  })
  @IsOptional()
  id?: number;

  @ApiProperty({
    description: "Tên câu hỏi",
    example: "Bạn có kinh nghiệm bao nhiêu năm?"
  })
  @IsString()
  label: string;

  @ApiProperty({
    description: "Loại field",
    example: "text"
  })
  @IsString()
  fieldType: string;

  @ApiProperty({
    description: "Có bắt buộc không",
    example: true
  })
  @IsBoolean()
  isRequired: boolean;

  @ApiPropertyOptional({
    description: "Options (JSON string nếu là select/radio)",
    example: '["1 năm","2 năm","3 năm"]'
  })
  @IsOptional()
  @IsString()
  options?: string;
}