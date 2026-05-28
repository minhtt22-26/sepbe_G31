import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtStrategy } from './jwt.strategy'

const mockConfigService = {
  get: jest.fn((key: string, def: string) => (key === 'jwt.secret' ? 'test-secret' : def)),
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()
    strategy = module.get<JwtStrategy>(JwtStrategy)
  })

  describe('validate', () => {
    it('returns user object from JWT payload', async () => {
      const payload = { sub: 5, email: 'user@test.com', role: 'WORKER' }
      const result = await strategy.validate(payload)
      expect(result).toEqual({ id: 5, email: 'user@test.com', role: 'WORKER' })
    })

    it('maps sub to id correctly', async () => {
      const payload = { sub: 99, email: 'admin@test.com', role: 'ADMIN' }
      const result = await strategy.validate(payload)
      expect(result.id).toBe(99)
    })
  })
})
