import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty } from 'class-validator'
import { JobApplicationStatus } from 'src/generated/prisma/enums'

export class UpdateApplicationStatusRequest {
  @ApiProperty({ enum: JobApplicationStatus, description: 'New status for the application' })
  @IsEnum(JobApplicationStatus)
  @IsNotEmpty()
  status!: JobApplicationStatus
}
