import 'reflect-metadata'
import { validateEnv } from './validate-env'

const validConfig = {
  NODE_ENV: 'development',
  APP_API_PREFIX: 'api',
  REDIS_URL: 'redis://localhost:6379',
}

describe('validateEnv', () => {
  it('returns validated config when all required fields are present', () => {
    const result = validateEnv(validConfig)
    expect(result.NODE_ENV).toBe('development')
    expect(result.APP_API_PREFIX).toBe('api')
    expect(result.REDIS_URL).toBe('redis://localhost:6379')
  })

  it('accepts all three valid NODE_ENV values', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'production' })).not.toThrow()
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'test' })).not.toThrow()
  })

  it('throws when NODE_ENV is missing', () => {
    const { NODE_ENV: _, ...withoutNodeEnv } = validConfig
    expect(() => validateEnv(withoutNodeEnv)).toThrow()
  })

  it('throws when NODE_ENV is invalid enum value', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow()
  })

  it('throws when APP_API_PREFIX is missing', () => {
    const { APP_API_PREFIX: _, ...withoutPrefix } = validConfig
    expect(() => validateEnv(withoutPrefix)).toThrow()
  })

  it('throws when REDIS_URL is missing', () => {
    const { REDIS_URL: _, ...withoutRedis } = validConfig
    expect(() => validateEnv(withoutRedis)).toThrow()
  })

  it('accepts optional fields when provided', () => {
    const result = validateEnv({
      ...validConfig,
      APP_PORT: 4000,
      DATABASE_URL: 'postgresql://localhost/db',
      JWT_SECRET: 'secret',
      SEPAY_WEBHOOK_API_KEY: 'key',
      SEPAY_BANK_CODE: 'VCB',
      SEPAY_ACCOUNT_NUMBER: '123456',
      SEPAY_ACCOUNT_NAME: 'WorkLink',
      SEPAY_ORDER_PREFIX: 'TOPUP',
    })
    expect(result.REDIS_URL).toBe('redis://localhost:6379')
  })
})
