import emailConfig from './email.config'

describe('emailConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('uses default port 587 when EMAIL_PORT not set', () => {
    delete process.env.EMAIL_PORT
    const cfg = emailConfig()
    expect(cfg.port).toBe(587)
    expect(cfg.secure).toBe(false)
  })

  it('sets secure=true when port is 465', () => {
    process.env.EMAIL_PORT = '465'
    const cfg = emailConfig()
    expect(cfg.port).toBe(465)
    expect(cfg.secure).toBe(true)
  })

  it('uses configured email settings from env', () => {
    process.env.EMAIL_HOST = 'smtp.gmail.com'
    process.env.EMAIL_PORT = '587'
    process.env.EMAIL_USER = 'user@gmail.com'
    process.env.EMAIL_PASSWORD = 'secret'
    process.env.EMAIL_FROM = 'noreply@worklink.vn'
    const cfg = emailConfig()
    expect(cfg.host).toBe('smtp.gmail.com')
    expect(cfg.user).toBe('user@gmail.com')
    expect(cfg.from).toBe('noreply@worklink.vn')
  })

  it('falls back to 587 when EMAIL_PORT is not a valid number', () => {
    process.env.EMAIL_PORT = 'invalid'
    const cfg = emailConfig()
    expect(cfg.port).toBe(587)
  })
})
