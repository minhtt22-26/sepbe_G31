import { IsEnum, IsNotEmpty } from 'class-validator'
import { EnumUserStatus } from 'src/generated/prisma/enums'

export class UserUpdateStatusRequestDto {
  @IsNotEmpty()
  @IsEnum([EnumUserStatus.ACTIVE, EnumUserStatus.DELETED])
  status: EnumUserStatus
}
