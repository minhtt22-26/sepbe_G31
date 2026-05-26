import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AuthTokenResponseDto {
    @ApiProperty({ example: 'Bearer' })
    tokenType: string

    @ApiProperty({ example: 900 })
    expiredIn: number

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    refreshToken: string

    @ApiPropertyOptional({ example: 'WORKER' })
    roleType?: string
}
