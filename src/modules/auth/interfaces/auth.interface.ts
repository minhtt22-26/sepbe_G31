import { EnumUserLoginWith, EnumUserRole } from "src/generated/prisma/enums"

export interface IAuthAccessTokenGenerate {
    tokens: {
        tokenType: string,
        expiredIn: number,
        accessToken: string,
        refreshToken: string,
    }
    jti: string,
    sessionId: string,
}

export interface IAuthRefreshTokenGenerate extends IAuthAccessTokenGenerate {
    expiredInMs: number,
}


export interface IAuthAccessTokenPayload {
    userId: number,
    sessionId: string,
    email?: string,
    username: string
    lastLoginAt: Date,
    loginWith: EnumUserLoginWith
    role: EnumUserRole,

    jti?: string,
    iat?: number,
    epx?: number,
    aud?: string,
    iss?: string
}

export type IAuthRefreshTokenPayload = Omit<
    IAuthAccessTokenPayload,
    'username' | 'email' | "role"
>


//Password interface
export class IAuthPassword {
    passwordHash: string
    passwordExpired: Date
    passwordCreated: Date
    passwordPeriodExpired: Date
}