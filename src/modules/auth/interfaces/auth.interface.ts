import { EnumUserLoginWith, EnumUserRole } from 'src/generated/prisma/enums'

export interface IAuthAccessTokenGenerate {
  tokens: {
    tokenType: string
    expiredIn: number
    accessToken: string
    refreshToken: string
    role?: EnumUserRole
  }
  jti: string
  sessionId: string
}

export interface IAuthRefreshTokenGenerate extends IAuthAccessTokenGenerate {
  expiredInMs: number
}

export interface IAuthAccessTokenPayload {
  userId: number
  sessionId: string
  email?: string
  userName?: string
  lastLoginAt: Date
  loginWith: EnumUserLoginWith
  role: EnumUserRole

  jti?: string
  iat?: number
  exp?: number
  aud?: string
  iss?: string
}

export type IAuthRefreshTokenPayload = Omit<
  IAuthAccessTokenPayload,
  'userName' | 'email' | 'role'
>

//Password interface
export class IAuthPassword {
  passwordHash: string
  passwordExpired: Date
  passwordCreated: Date
  passwordPeriodExpired: Date
}

export interface IForgotPasswordCreate {
  token: string
  expiredAt: Date
  link: string
  expiredInMinutes: number
  resendInMinutes: number
}

export interface IAuthSocialPayload {
  email: string
  emailVerified: boolean
}
