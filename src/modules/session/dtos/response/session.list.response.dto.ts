import { Expose } from "class-transformer"

export class SessionListResponseDto {
    @Expose()
    id: string

    @Expose()
    ipAddress?: string

    @Expose()
    userAgent?: string

    @Expose()
    isRevoked: boolean

    @Expose()
    expiredAt: Date

    @Expose()
    createdAt: Date

    @Expose()
    revokedAt?: Date
}