import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { InterviewInvitationStatus } from 'src/generated/prisma/enums'

export class RespondInvitationRequestDto {
  @ApiProperty({ 
    description: 'Trạng thái phản hồi của worker',
    enum: [InterviewInvitationStatus.ACCEPTED, InterviewInvitationStatus.REJECTED],
    example: InterviewInvitationStatus.ACCEPTED 
  })
  @IsEnum([InterviewInvitationStatus.ACCEPTED, InterviewInvitationStatus.REJECTED])
  @IsNotEmpty()
  status: InterviewInvitationStatus

  @ApiProperty({ 
    description: 'Lý do từ chối (bắt buộc nếu status = REJECTED)',
    required: false,
    example: 'Tôi không có thời gian phỏng vấn vào lúc này'
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  responseMessage?: string
}
