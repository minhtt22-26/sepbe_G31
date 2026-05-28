import { Test, TestingModule } from '@nestjs/testing'
import { AuthUtil } from './auth.utils'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { HelperService } from 'src/common/helper/service/helper.service'
import { EnumUserLoginWith, EnumUserRole } from 'src/generated/prisma/enums'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  decode: jest.fn().mockReturnValue({ userId: 1 }),
  verifyAsync: jest.fn().mockResolvedValue({ userId: 1 }),
}

const configMap: Record<string, any> = {
  'auth.jwt.accessToken.secret': 'access-secret',
  'auth.jwt.accessToken.expiresIn': 3600,
  'auth.jwt.accessToken.algorithm': 'HS256',
  'auth.jwt.refreshToken.secret': 'refresh-secret',
  'auth.jwt.refreshToken.expiresIn': 86400,
  'auth.jwt.refreshToken.algorithm': 'HS256',
  'auth.jwt.audience': 'worklink',
  'auth.jwt.issuer': 'worklink-api',
  'auth.jwt.header': 'authorization',
  'auth.jwt.prefix': 'Bearer',
  'auth.password.attempt': true,
  'auth.password.maxAttempt': 5,
  'auth.password.saltLength': 10,
  'auth.forgotPassword.tokenLength': 32,
  'auth.forgotPassword.expiredInMinutes': 900,
  'auth.forgotPassword.resendInMinutes': 300,
  'auth.forgotPassword.baseUrl': 'https://worklink.vn/reset-password',
  'auth.google.header': 'x-google-token',
  'auth.google.prefix': 'Google',
  'auth.google.clientId': 'google-client-id',
  'auth.google.clientSecret': 'google-client-secret',
}

const mockConfigService = {
  get: jest.fn((key: string) => configMap[key]),
  getOrThrow: jest.fn((key: string) => configMap[key]),
}

const mockHelperService = {
  randomString: jest.fn().mockReturnValue('random-string-32chars'),
  bcryptGenrateSalt: jest.fn().mockReturnValue('$2b$10$salt'),
  bcryptHash: jest.fn().mockReturnValue('$2b$10$hashed'),
  bcryptCompare: jest.fn().mockReturnValue(true),
  dateCreate: jest.fn().mockReturnValue(new Date('2025-01-01')),
  dateForward: jest.fn().mockReturnValue(new Date('2025-01-16')),
  dateCreateDuration: jest.fn().mockReturnValue({ seconds: 900 }),
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AuthUtil', () => {
  let authUtil: AuthUtil

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthUtil,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HelperService, useValue: mockHelperService },
      ],
    }).compile()

    authUtil = module.get<AuthUtil>(AuthUtil)
  })

  // ── createAccessTokenPayload ──────────────────────────────────────────────

  describe('createAccessTokenPayload', () => {
    it('builds access token payload from user data', () => {
      const user: any = {
        id: 5,
        email: 'test@test.com',
        userName: 'test_user',
        role: EnumUserRole.EMPLOYER,
      }
      const payload = authUtil.createAccessTokenPayload(
        user,
        'session-abc',
        new Date(),
        EnumUserLoginWith.CREDENTIAL,
      )
      expect(payload.userId).toBe(5)
      expect(payload.email).toBe('test@test.com')
      expect(payload.sessionId).toBe('session-abc')
      expect(payload.role).toBe(EnumUserRole.EMPLOYER)
      expect(payload.loginWith).toBe(EnumUserLoginWith.CREDENTIAL)
    })

    it('handles null email and userName gracefully', () => {
      const user: any = { id: 3, email: null, userName: null, role: EnumUserRole.WORKER }
      const payload = authUtil.createAccessTokenPayload(user, 's1', new Date(), EnumUserLoginWith.SOCIAL_GOOGLE)
      expect(payload.email).toBeUndefined()
      expect(payload.userName).toBeUndefined()
    })
  })

  // ── createRefreshTokenPayload ─────────────────────────────────────────────

  describe('createRefreshTokenPayload', () => {
    it('returns refresh token payload unchanged', () => {
      const input = {
        userId: 7,
        sessionId: 'sess-xyz',
        lastLoginAt: new Date(),
        loginWith: EnumUserLoginWith.CREDENTIAL,
      }
      const payload = authUtil.createRefreshTokenPayload(input)
      expect(payload).toEqual(input)
    })
  })

  // ── createAccessTokens ────────────────────────────────────────────────────

  describe('createAccessTokens', () => {
    it('calls jwtService.sign with correct options', () => {
      const payload: any = { userId: 1, sessionId: 's1', role: EnumUserRole.WORKER }
      const token = authUtil.createAccessTokens('jti-abc', payload)
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ secret: 'access-secret', jwtid: 'jti-abc' }),
      )
      expect(token).toBe('signed-token')
    })
  })

  // ── createRefreshTokens ───────────────────────────────────────────────────

  describe('createRefreshTokens', () => {
    it('calls jwtService.sign with refresh secret', () => {
      const payload: any = { userId: 1, sessionId: 's1' }
      authUtil.createRefreshTokens('jti-xyz', payload)
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ secret: 'refresh-secret' }),
      )
    })

    it('uses custom expiresIn when provided', () => {
      authUtil.createRefreshTokens('jti', { userId: 1 } as any, 7200)
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ expiresIn: 7200 }),
      )
    })
  })

  // ── generateJti ───────────────────────────────────────────────────────────

  describe('generateJti', () => {
    it('delegates to helperService.randomString(32)', () => {
      const jti = authUtil.generateJti()
      expect(mockHelperService.randomString).toHaveBeenCalledWith(32)
      expect(jti).toBe('random-string-32chars')
    })
  })

  // ── payloadToken ──────────────────────────────────────────────────────────

  describe('payloadToken', () => {
    it('decodes token via jwtService', () => {
      const result = authUtil.payloadToken<{ userId: number }>('some.jwt.token')
      expect(mockJwtService.decode).toHaveBeenCalledWith('some.jwt.token')
      expect(result.userId).toBe(1)
    })
  })

  // ── verifyAccessToken ─────────────────────────────────────────────────────

  describe('verifyAccessToken', () => {
    it('verifies token with correct options', async () => {
      const result = await authUtil.verifyAccessToken('valid.token')
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid.token',
        expect.objectContaining({ secret: 'access-secret' }),
      )
      expect(result).toEqual({ userId: 1 })
    })
  })

  // ── createPassword ────────────────────────────────────────────────────────

  describe('createPassword', () => {
    it('generates salt and hashes password', () => {
      const result = authUtil.createPassword('myPassword123')
      expect(mockHelperService.bcryptGenrateSalt).toHaveBeenCalledWith(10)
      expect(mockHelperService.bcryptHash).toHaveBeenCalledWith('myPassword123', '$2b$10$salt')
      expect(result.passwordHash).toBe('$2b$10$hashed')
    })
  })

  // ── validatePassword ──────────────────────────────────────────────────────

  describe('validatePassword', () => {
    it('returns true when password matches hash', () => {
      const result = authUtil.validatePassword('plain', '$2b$10$hashed')
      expect(mockHelperService.bcryptCompare).toHaveBeenCalledWith('plain', '$2b$10$hashed')
      expect(result).toBe(true)
    })

    it('returns false when password does not match', () => {
      mockHelperService.bcryptCompare.mockReturnValueOnce(false)
      expect(authUtil.validatePassword('wrong', '$2b$10$hashed')).toBe(false)
    })
  })

  // ── checkPasswordAttempt ──────────────────────────────────────────────────

  describe('checkPasswordAttempt', () => {
    it('returns true when attempts reached max', () => {
      const user: any = { passwordAttempt: 5 }
      expect(authUtil.checkPasswordAttempt(user)).toBe(true)
    })

    it('returns false when attempts below max', () => {
      const user: any = { passwordAttempt: 2 }
      expect(authUtil.checkPasswordAttempt(user)).toBe(false)
    })
  })

  // ── createForgotPassword ──────────────────────────────────────────────────

  describe('createForgotPassword', () => {
    it('creates forgot password data with token and link', () => {
      const result = authUtil.createForgotPassword()
      expect(result.token).toBe('random-string-32chars')
      expect(result.link).toContain('random-string-32chars')
      expect(result.link).toContain('https://worklink.vn/reset-password')
      expect(result.expiredAt).toBeInstanceOf(Date)
    })
  })

  // ── forgotPasswordResendMinutes ───────────────────────────────────────────

  describe('forgotPasswordResendMinutes', () => {
    it('returns the resend interval in seconds', () => {
      expect(authUtil.forgotPasswordResendMinutes).toBe(300)
    })
  })

  // ── pickGoogleDisplayName ─────────────────────────────────────────────────

  describe('pickGoogleDisplayName', () => {
    it('returns name when present', () => {
      const payload: any = { name: 'Nguyen Van A' }
      expect(authUtil.pickGoogleDisplayName(payload)).toBe('Nguyen Van A')
    })

    it('concatenates given_name and family_name when name missing', () => {
      const payload: any = { given_name: 'Van A', family_name: 'Nguyen' }
      expect(authUtil.pickGoogleDisplayName(payload)).toBe('Van A Nguyen')
    })

    it('returns undefined when all name fields are missing', () => {
      expect(authUtil.pickGoogleDisplayName({} as any)).toBeUndefined()
    })

    it('trims whitespace from name', () => {
      const payload: any = { name: '  Nguyen Van A  ' }
      expect(authUtil.pickGoogleDisplayName(payload)).toBe('Nguyen Van A')
    })

    it('returns only given_name when family_name missing', () => {
      const payload: any = { given_name: 'Van A' }
      expect(authUtil.pickGoogleDisplayName(payload)).toBe('Van A')
    })
  })

  // ── extractHeaderGoogle ───────────────────────────────────────────────────

  describe('extractHeaderGoogle', () => {
    it('splits google header by prefix', () => {
      const request = { headers: { 'x-google-token': 'Google some.id.token' } }
      const parts = authUtil.extractHeaderGoogle(request)
      expect(parts).toContain('some.id.token')
    })

    it('returns empty array when header missing', () => {
      const result = authUtil.extractHeaderGoogle({ headers: {} })
      expect(result).toEqual([])
    })
  })
})
