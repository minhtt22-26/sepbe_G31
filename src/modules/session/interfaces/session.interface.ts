export interface ISessionCreate {
    id: string,
    userId: number,
    jti: string,
    ipAddress?: string,
    userAgent?: string,
    expiredAt: Date
}