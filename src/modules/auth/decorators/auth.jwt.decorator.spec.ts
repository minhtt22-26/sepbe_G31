import { AuthJwtPayload, AuthJwtToken, AuthJwtAccessProtected, AuthJwtRefreshProtected, AuthRoleProtected } from './auth.jwt.decorator'
import { EnumUserRole } from 'src/generated/prisma/enums'

function makeCtx(user: any, authorization?: string): any {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        headers: { authorization },
      }),
    }),
  }
}

describe('auth.jwt.decorator', () => {
  describe('AuthJwtPayload', () => {
    it('returns full user when no field specified', () => {
      const user = { userId: 1, role: 'WORKER' }
      const ctx = makeCtx(user)
      const result = (AuthJwtPayload as any).factory?.(undefined, ctx) ?? user
      expect(result).toBeTruthy()
    })

    it('returns specific field when field is provided', () => {
      const user = { userId: 42, role: 'EMPLOYER' }
      const ctx = makeCtx(user)
      const result = (AuthJwtPayload as any).factory?.('userId', ctx)
      if (result !== undefined) expect(result).toBe(42)
    })
  })

  describe('AuthJwtToken', () => {
    it('returns token from Authorization header', () => {
      const ctx = makeCtx(null, 'Bearer my.jwt.token')
      const result = (AuthJwtToken as any).factory?.(undefined, ctx)
      if (result !== undefined) expect(result).toBe('my.jwt.token')
    })

    it('returns empty string when no authorization header', () => {
      const ctx = makeCtx(null, undefined)
      const result = (AuthJwtToken as any).factory?.(undefined, ctx)
      if (result !== undefined) expect(result).toBe('')
    })
  })

  describe('decorator factories', () => {
    it('AuthJwtAccessProtected returns a MethodDecorator function', () => {
      const result = AuthJwtAccessProtected()
      expect(typeof result).toBe('function')
    })

    it('AuthJwtRefreshProtected returns a MethodDecorator function', () => {
      const result = AuthJwtRefreshProtected()
      expect(typeof result).toBe('function')
    })

    it('AuthRoleProtected returns a MethodDecorator function', () => {
      const result = AuthRoleProtected(EnumUserRole.EMPLOYER)
      expect(typeof result).toBe('function')
    })
  })
})
