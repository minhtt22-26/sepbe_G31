import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthUtil } from '../utils/auth.utils'
import { HelperService } from 'src/common/helper/service/helper.service'
import { SessionService } from 'src/modules/session/service/session.service'
import { EnumUserLoginWith, EnumUserRole, EnumUserStatus } from 'src/generated/prisma/enums'

const authUtilMock = {
    generateJti: jest.fn(),
    createAccessTokenPayload: jest.fn(),
    createAccessTokens: jest.fn(),
    createRefreshTokenPayload: jest.fn(),
    createRefreshTokens: jest.fn(),
    payloadToken: jest.fn(),
    jwtPrefix: 'Bearer',
    jwtAccessTokenExpirationTimeInSeconds: 900,
    extractHeaderGoogle: jest.fn(),
    verifyGoogle: jest.fn(),
    pickGoogleDisplayName: jest.fn(),
}

const helperServiceMock = {
    dateCreate: jest.fn(),
    randomString: jest.fn(),
    dateCreateFromTimestamp: jest.fn(),
    dateDriff: jest.fn(),
}

const sessionServiceMock = {
    getLogin: jest.fn(),
}

const mockUser: any = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    role: EnumUserRole.WORKER,
    status: EnumUserStatus.ACTIVE,
}

describe('AuthService', () => {
    let service: AuthService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: AuthUtil, useValue: authUtilMock },
                { provide: HelperService, useValue: helperServiceMock },
                { provide: SessionService, useValue: sessionServiceMock },
            ],
        }).compile()

        service = module.get<AuthService>(AuthService)
    })

    afterEach(() => jest.clearAllMocks())

    describe('createTokens', () => {
        it('[N] should return tokens, jti, and sessionId', () => {
            const now = new Date()
            helperServiceMock.dateCreate.mockReturnValue(now)
            authUtilMock.generateJti.mockReturnValue('jti-abc')
            helperServiceMock.randomString.mockReturnValue('session-xyz')
            authUtilMock.createAccessTokenPayload.mockReturnValue({ userId: 1 })
            authUtilMock.createAccessTokens.mockReturnValue('access-token')
            authUtilMock.createRefreshTokenPayload.mockReturnValue({ userId: 1 })
            authUtilMock.createRefreshTokens.mockReturnValue('refresh-token')

            const result = service.createTokens(mockUser, EnumUserLoginWith.CREDENTIAL)

            expect(result.jti).toBe('jti-abc')
            expect(result.sessionId).toBe('session-xyz')
            expect(result.tokens.accessToken).toBe('access-token')
            expect(result.tokens.refreshToken).toBe('refresh-token')
            expect(result.tokens.role).toBe(EnumUserRole.WORKER)
        })
    })

    describe('refreshTokens', () => {
        it('[N] should return new tokens with remaining expiry', () => {
            const futureDate = new Date(Date.now() + 86400000)
            authUtilMock.payloadToken.mockReturnValue({
                sessionId: 'sess-1',
                loginWith: EnumUserLoginWith.CREDENTIAL,
                lastLoginAt: new Date(),
                exp: Math.floor(futureDate.getTime() / 1000),
            })
            authUtilMock.generateJti.mockReturnValue('new-jti')
            authUtilMock.createAccessTokenPayload.mockReturnValue({ userId: 1 })
            authUtilMock.createAccessTokens.mockReturnValue('new-access')
            authUtilMock.createRefreshTokenPayload.mockReturnValue({ userId: 1 })
            authUtilMock.createRefreshTokens.mockReturnValue('new-refresh')
            helperServiceMock.dateCreate.mockReturnValue(new Date())
            helperServiceMock.dateCreateFromTimestamp.mockReturnValue(futureDate)
            helperServiceMock.dateDriff.mockReturnValue({ seconds: 86000, miliseconds: 86000000 })

            const result = service.refreshTokens(mockUser, 'old-refresh-token')

            expect(result.tokens.accessToken).toBe('new-access')
            expect(result.tokens.refreshToken).toBe('new-refresh')
            expect(result.jti).toBe('new-jti')
        })
    })

    describe('validateJwtAccessStrategy', () => {
        it('[N] should return payload when session is valid', async () => {
            sessionServiceMock.getLogin.mockResolvedValue({ jti: 'valid-jti', expiredAt: new Date() })
            const payload: any = { userId: 1, sessionId: 'sess-1', jti: 'valid-jti' }

            const result = await service.validateJwtAccessStrategy(payload)

            expect(result).toBe(payload)
        })

        it('[A] should throw UnauthorizedException when fields are missing', async () => {
            await expect(
                service.validateJwtAccessStrategy({ userId: 0, sessionId: '', jti: '' } as any),
            ).rejects.toThrow(UnauthorizedException)
        })

        it('[A] should throw UnauthorizedException when session not found', async () => {
            sessionServiceMock.getLogin.mockResolvedValue(null)

            await expect(
                service.validateJwtAccessStrategy({ userId: 1, sessionId: 'sess-1', jti: 'jti-1' } as any),
            ).rejects.toThrow(UnauthorizedException)
        })

        it('[A] should throw UnauthorizedException when jti mismatch', async () => {
            sessionServiceMock.getLogin.mockResolvedValue({ jti: 'other-jti', expiredAt: new Date() })

            await expect(
                service.validateJwtAccessStrategy({ userId: 1, sessionId: 'sess-1', jti: 'jti-1' } as any),
            ).rejects.toThrow(UnauthorizedException)
        })
    })

    describe('validateJwtRefreshStrategy', () => {
        it('[N] should return payload when refresh session is valid', async () => {
            sessionServiceMock.getLogin.mockResolvedValue({ jti: 'r-jti', expiredAt: new Date() })
            const payload: any = { userId: 1, sessionId: 'sess-1', jti: 'r-jti' }

            const result = await service.validateJwtRefreshStrategy(payload)

            expect(result).toBe(payload)
        })

        it('[A] should throw when session not found', async () => {
            sessionServiceMock.getLogin.mockResolvedValue(null)

            await expect(
                service.validateJwtRefreshStrategy({ userId: 1, sessionId: 's', jti: 'j' } as any),
            ).rejects.toThrow(UnauthorizedException)
        })

        it('[A] should throw when jti mismatch', async () => {
            sessionServiceMock.getLogin.mockResolvedValue({ jti: 'different', expiredAt: new Date() })

            await expect(
                service.validateJwtRefreshStrategy({ userId: 1, sessionId: 's', jti: 'j' } as any),
            ).rejects.toThrow(UnauthorizedException)
        })
    })

    describe('validateJwtAccessGuard', () => {
        it('[N] should return user when no error', async () => {
            const user: any = { userId: 1 }
            const result = await service.validateJwtAccessGuard(null as any, user, null as any)
            expect(result).toBe(user)
        })

        it('[A] should throw when err is present', async () => {
            await expect(
                service.validateJwtAccessGuard(new Error('expired'), null as any, null as any),
            ).rejects.toThrow(UnauthorizedException)
        })

        it('[A] should throw when user is null', async () => {
            await expect(
                service.validateJwtAccessGuard(null as any, null as any, null as any),
            ).rejects.toThrow(UnauthorizedException)
        })
    })

    describe('validateOAuthGoogleGuard', () => {
        it('[N] should set request.user and return true', async () => {
            authUtilMock.extractHeaderGoogle.mockReturnValue(['Bearer', 'google-token-xyz'])
            authUtilMock.verifyGoogle.mockResolvedValue({
                email: ' user@gmail.com ',
                email_verified: true,
            })
            authUtilMock.pickGoogleDisplayName.mockReturnValue('Google User')

            const request: any = {}
            const result = await service.validateOAuthGoogleGuard(request)

            expect(result).toBe(true)
            expect(request.user.email).toBe('user@gmail.com')
            expect(request.user.emailVerified).toBe(true)
        })

        it('[A] should throw when header has wrong format', async () => {
            authUtilMock.extractHeaderGoogle.mockReturnValue(['Bearer'])

            await expect(service.validateOAuthGoogleGuard({})).rejects.toThrow(UnauthorizedException)
        })

        it('[A] should throw when Google token is invalid', async () => {
            authUtilMock.extractHeaderGoogle.mockReturnValue(['Bearer', 'bad-token'])
            authUtilMock.verifyGoogle.mockRejectedValue(new Error('invalid token'))

            await expect(service.validateOAuthGoogleGuard({})).rejects.toThrow(UnauthorizedException)
        })

        it('[A] should throw when Google payload has no email', async () => {
            authUtilMock.extractHeaderGoogle.mockReturnValue(['Bearer', 'token'])
            authUtilMock.verifyGoogle.mockResolvedValue({ email: undefined })

            await expect(service.validateOAuthGoogleGuard({})).rejects.toThrow(UnauthorizedException)
        })
    })
})
