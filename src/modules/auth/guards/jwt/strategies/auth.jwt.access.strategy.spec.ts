import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { AuthJwtAccessStrategy } from './auth.jwt.access.strategy'
import { AuthService } from '../../../service/auth.service'

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'auth.jwt.accessToken.secret': 'test-secret',
      'auth.jwt.audience': 'worklink',
      'auth.jwt.issuer': 'worklink-api',
    }
    return map[key]
  }),
}

const mockAuthService = {
  validateJwtAccessStrategy: jest.fn(),
}

describe('AuthJwtAccessStrategy', () => {
  let strategy: AuthJwtAccessStrategy

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthJwtAccessStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile()
    strategy = module.get<AuthJwtAccessStrategy>(AuthJwtAccessStrategy)
  })

  it('validate delegates to authService', async () => {
    const payload: any = { userId: 1, sessionId: 'sess', jti: 'jti' }
    mockAuthService.validateJwtAccessStrategy.mockResolvedValue(payload)
    const result = await strategy.validate(payload)
    expect(mockAuthService.validateJwtAccessStrategy).toHaveBeenCalledWith(payload)
    expect(result).toBe(payload)
  })
})
