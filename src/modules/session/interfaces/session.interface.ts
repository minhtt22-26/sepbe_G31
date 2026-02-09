export interface ISessionCreate {
    userId: number,
    jti: string,
    ipAddress?: string,
    userAgent?: string,
    expiredAt: Date
}