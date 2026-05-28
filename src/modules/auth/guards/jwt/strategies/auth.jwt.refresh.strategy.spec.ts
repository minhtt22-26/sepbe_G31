import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { AuthJwtRefreshStrategy } from './auth.jwt.refresh.strategy'
import { AuthService } from '../../../service/auth.service'

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'auth.jwt.refreshToken.secret': 'refresh-secret',
      'auth.jwt.audience': 'worklink',
      'auth.jwt.issuer': 'worklink-api',
    }
    return map[key]
  }),
}

const mockAuthService = {
  validateJwtRefreshStrategy: jest.fn(),
}

describe('AuthJwtRefreshStrategy', () => {
  let strategy: AuthJwtRefreshStrategy

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthJwtRefreshStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile()
    strategy = module.get<AuthJwtRefreshStrategy>(AuthJwtRefreshStrategy)
  })

  it('validate delegates to authService', async () => {
    const payload: any = { userId: 1, sessionId: 'sess', jti: 'jti' }
    mockAuthService.validateJwtRefreshStrategy.mockResolvedValue(payload)
    const result = await strategy.validate(payload)
    expect(mockAuthService.validateJwtRefreshStrategy).toHaveBeenCalledWith(payload)
    expect(result).toBe(payload)
  })
})
