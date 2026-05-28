import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthUtil } from '../utils/auth.utils'
import { HelperService } from 'src/common/helper/service/helper.service'
import { SessionService } from 'src/modules/session/service/session.service'
import { EnumUserLoginWith, EnumUserRole } from 'src/generated/prisma/enums'

const mockAuthUtil = {
  generateJti: jest.fn().mockReturnValue('jti-abc'),
  createAccessTokenPayload: jest.fn().mockReturnValue({ userId: 1, sessionId: 'sess-1', role: EnumUserRole.EMPLOYER }),
  createAccessTokens: jest.fn().mockReturnValue('access-token'),
  createRefreshTokenPayload: jest.fn().mockReturnValue({ userId: 1, sessionId: 'sess-1' }),
  createRefreshTokens: jest.fn().mockReturnValue('refresh-token'),
  payloadToken: jest.fn().mockReturnValue({ userId: 1, sessionId: 'sess-1', loginWith: EnumUserLoginWith.CREDENTIAL, lastLoginAt: new Date(), exp: Math.floor(Date.now() / 1000) + 86400 }),
  extractHeaderGoogle: jest.fn(),
  verifyGoogle: jest.fn(),
  pickGoogleDisplayName: jest.fn().mockReturnValue('Nguyen Van A'),
  jwtPrefix: 'Bearer',
  jwtAccessTokenExpirationTimeInSeconds: 3600,
}

const mockHelperService = {
  dateCreate: jest.fn().mockReturnValue(new Date()),
  randomString: jest.fn().mockReturnValue('random-session-id-24chars'),
  dateCreateFromTimestamp: jest.fn().mockReturnValue(new Date(Date.now() + 86400000)),
  dateDriff: jest.fn().mockReturnValue({ seconds: 86400, miliseconds: 86400000 }),
}

const mockSessionService = {
  getLogin: jest.fn(),
}

const mockUser: any = {
  id: 1,
  email: 'test@example.com',
  userName: 'test',
  role: EnumUserRole.EMPLOYER,
  status: 'ACTIVE',
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthUtil, useValue: mockAuthUtil },
        { provide: HelperService, useValue: mockHelperService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  // ── createTokens ──────────────────────────────────────────────────────────

  describe('createTokens', () => {
    it('returns access and refresh tokens with jti and sessionId', () => {
      const result = service.createTokens(mockUser, EnumUserLoginWith.CREDENTIAL)
      expect(result.tokens.accessToken).toBe('access-token')
      expect(result.tokens.refreshToken).toBe('refresh-token')
      expect(result.jti).toBe('jti-abc')
      expect(result.sessionId).toBe('random-session-id-24chars')
      expect(result.tokens.tokenType).toBe('Bearer')
      expect(result.tokens.expiredIn).toBe(3600)
    })

    it('includes role in token response', () => {
      const result = service.createTokens(mockUser, EnumUserLoginWith.CREDENTIAL)
      expect(result.tokens.role).toBe(EnumUserRole.EMPLOYER)
    })
  })

  // ── refreshTokens ─────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('returns new tokens preserving session', () => {
      const result = service.refreshTokens(mockUser, 'old-refresh-token')
      expect(result.tokens.accessToken).toBe('access-token')
      expect(result.tokens.refreshToken).toBe('refresh-token')
      expect(result.jti).toBe('jti-abc')
      expect(result.expiredInMs).toBe(86400000)
    })

    it('uses seconds when miliseconds not set', () => {
      mockHelperService.dateDriff.mockReturnValueOnce({ seconds: 7200, miliseconds: 0 })
      service.refreshTokens(mockUser, 'old-refresh-token')
      expect(mockAuthUtil.createRefreshTokens).toHaveBeenCalledWith(
        'jti-abc',
        expect.anything(),
        7200,
      )
    })
  })

  // ── validateJwtAccessStrategy ─────────────────────────────────────────────

  describe('validateJwtAccessStrategy', () => {
    const validPayload: any = { userId: 1, sessionId: 'sess-1', jti: 'jti-abc' }

    it('returns payload when session is valid', async () => {
      mockSessionService.getLogin.mockResolvedValue({ jti: 'jti-abc' })
      const result = await service.validateJwtAccessStrategy(validPayload)
      expect(result).toBe(validPayload)
    })

    it('throws when userId is missing', async () => {
      await expect(service.validateJwtAccessStrategy({ userId: null, sessionId: 'x', jti: 'y' } as any))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws when session not found', async () => {
      mockSessionService.getLogin.mockResolvedValue(null)
      await expect(service.validateJwtAccessStrategy(validPayload)).rejects.toThrow(UnauthorizedException)
    })

    it('throws when jti mismatch', async () => {
      mockSessionService.getLogin.mockResolvedValue({ jti: 'different-jti' })
      await expect(service.validateJwtAccessStrategy(validPayload)).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── validateJwtRefreshStrategy ────────────────────────────────────────────

  describe('validateJwtRefreshStrategy', () => {
    const validPayload: any = { userId: 1, sessionId: 'sess-1', jti: 'jti-abc' }

    it('returns payload when refresh session is valid', async () => {
      mockSessionService.getLogin.mockResolvedValue({ jti: 'jti-abc' })
      const result = await service.validateJwtRefreshStrategy(validPayload)
      expect(result).toBe(validPayload)
    })

    it('throws when sessionId is missing', async () => {
      await expect(service.validateJwtRefreshStrategy({ userId: 1, sessionId: null, jti: 'y' } as any))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws when session expired (not found)', async () => {
      mockSessionService.getLogin.mockResolvedValue(null)
      await expect(service.validateJwtRefreshStrategy(validPayload)).rejects.toThrow(UnauthorizedException)
    })

    it('throws when jti mismatch', async () => {
      mockSessionService.getLogin.mockResolvedValue({ jti: 'wrong' })
      await expect(service.validateJwtRefreshStrategy(validPayload)).rejects.toThrow(UnauthorizedException)
    })
  })

  // ── validateJwtAccessGuard ────────────────────────────────────────────────

  describe('validateJwtAccessGuard', () => {
    it('returns user when no error', async () => {
      const user: any = { userId: 1 }
      const result = await service.validateJwtAccessGuard(null as any, user, null as any)
      expect(result).toBe(user)
    })

    it('throws when err is present', async () => {
      await expect(service.validateJwtAccessGuard(new Error('expired'), null as any, null as any))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws when user is null', async () => {
      await expect(service.validateJwtAccessGuard(null as any, null as any, new Error('info')))
        .rejects.toThrow(UnauthorizedException)
    })
  })

  // ── validateJwtRefreshGuard ───────────────────────────────────────────────

  describe('validateJwtRefreshGuard', () => {
    it('returns user when no error', async () => {
      const user: any = { userId: 1 }
      const result = await service.validateJwtRefreshGuard(null as any, user, null as any)
      expect(result).toBe(user)
    })

    it('throws when user is null', async () => {
      await expect(service.validateJwtRefreshGuard(null as any, null as any, null as any))
        .rejects.toThrow(UnauthorizedException)
    })
  })

  // ── validateOAuthGoogleGuard ──────────────────────────────────────────────

  describe('validateOAuthGoogleGuard', () => {
    it('throws when google header has wrong format', async () => {
      mockAuthUtil.extractHeaderGoogle.mockReturnValue(['invalid'])
      await expect(service.validateOAuthGoogleGuard({ headers: {} })).rejects.toThrow(UnauthorizedException)
    })

    it('sets request.user and returns true for valid google token', async () => {
      mockAuthUtil.extractHeaderGoogle.mockReturnValue(['Google', 'valid.id.token'])
      mockAuthUtil.verifyGoogle.mockResolvedValue({
        email: 'google@test.com',
        email_verified: true,
        name: 'Nguyen Van A',
      })
      const req: any = {}
      const result = await service.validateOAuthGoogleGuard(req)
      expect(result).toBe(true)
      expect(req.user.email).toBe('google@test.com')
      expect(req.user.fullName).toBe('Nguyen Van A')
    })

    it('throws when google payload has no email', async () => {
      mockAuthUtil.extractHeaderGoogle.mockReturnValue(['Google', 'token'])
      mockAuthUtil.verifyGoogle.mockResolvedValue({ email: null })
      await expect(service.validateOAuthGoogleGuard({})).rejects.toThrow(UnauthorizedException)
    })

    it('throws when verifyGoogle throws an error', async () => {
      mockAuthUtil.extractHeaderGoogle.mockReturnValue(['Google', 'bad-token'])
      mockAuthUtil.verifyGoogle.mockRejectedValue(new Error('Invalid token'))
      await expect(service.validateOAuthGoogleGuard({})).rejects.toThrow(UnauthorizedException)
    })
  })
})
