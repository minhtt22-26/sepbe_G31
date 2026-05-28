import { AuthUserMiddleware } from './auth-user.middleware'

const mockAuthUtil = { verifyAccessToken: jest.fn() }

function buildMiddleware() {
  return new AuthUserMiddleware(mockAuthUtil as any)
}

const next = jest.fn()

describe('AuthUserMiddleware', () => {
  beforeEach(() => jest.clearAllMocks())

  it('attaches user to request when valid Bearer token provided', async () => {
    const payload = { userId: 1, role: 'WORKER' }
    mockAuthUtil.verifyAccessToken.mockResolvedValue(payload)
    const req: any = { headers: { authorization: 'Bearer valid.token.here' } }
    await buildMiddleware().use(req, {} as any, next)
    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalled()
  })

  it('skips user attachment when no authorization header', async () => {
    const req: any = { headers: {} }
    await buildMiddleware().use(req, {} as any, next)
    expect(mockAuthUtil.verifyAccessToken).not.toHaveBeenCalled()
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('skips when authorization does not start with Bearer', async () => {
    const req: any = { headers: { authorization: 'Basic dXNlcjpwYXNz' } }
    await buildMiddleware().use(req, {} as any, next)
    expect(mockAuthUtil.verifyAccessToken).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('calls next and logs when JWT verification fails', async () => {
    mockAuthUtil.verifyAccessToken.mockRejectedValue(new Error('expired'))
    const req: any = { headers: { authorization: 'Bearer bad.token' } }
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    await buildMiddleware().use(req, {} as any, next)
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
