import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export enum ReportReason {
    FRAUD = "FRAUD",
    INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
    SCAM = "SCAM",
    DUPLICATE = "DUPLICATE",
    MISLEADING_INFO = "MISLEADING_INFO",
    OTHER = "OTHER",
}
export enum ReportStatus {
    PENDING = "PENDING",
    RESOLVED = "RESOLVED",
    REJECTED = "REJECTED",
}
export class JobReportDto {
  @ApiProperty({ description: "ID của công việc bị báo cáo", example: 1 })
  @IsNotEmpty({ message: "jobId không được để trống" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId: number;

  @ApiProperty({ 
    description: "Lý do báo cáo", 
    enum: ReportReason, 
    example: ReportReason.FRAUD 
  })
  @IsNotEmpty({ message: "Lý do báo cáo không được để trống" })
  @IsEnum(ReportReason, { message: "Lý do báo cáo không hợp lệ" })
  reason: ReportReason;

  @ApiPropertyOptional({ 
    description: "Mô tả chi tiết lý do báo cáo", 
    example: "Công việc này yêu cầu nộp tiền trước" 
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateJobReportStatusDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.RESOLVED })
  @IsEnum(ReportStatus, { message: "Trạng thái báo cáo không hợp lệ" })
  status: ReportStatus;
}