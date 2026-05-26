import { ApiProperty } from '@nestjs/swagger'
import { AuthTokenResponseDto } from "src/modules/auth/dto/response/auth.response.token.dto";

export class UserLoginResponseDto {
    @ApiProperty({ type: () => AuthTokenResponseDto })
    tokens: AuthTokenResponseDto
}
