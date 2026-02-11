export class AuthTokenResponseDto {
    tokenType: string
    expiredIn: number
    accessToken: string
    refreshToken: string
    roleType?: string
}