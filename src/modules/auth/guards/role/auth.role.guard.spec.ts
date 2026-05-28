import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthRoleGuard } from './auth.role.guard'
import { EnumUserRole } from 'src/generated/prisma/enums'

const mockReflector = { getAllAndOverride: jest.fn() }

function makeContext(user: any, handler = jest.fn(), cls = jest.fn()): any {
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }
}

describe('AuthRoleGuard', () => {
  let guard: AuthRoleGuard

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRoleGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile()
    guard = module.get<AuthRoleGuard>(AuthRoleGuard)
  })

  it('allows access when no roles are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null)
    expect(await guard.canActivate(makeContext(null))).toBe(true)
  })

  it('allows access when required roles list is empty', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([])
    expect(await guard.canActivate(makeContext(null))).toBe(true)
  })

  it('denies access when no user on request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([EnumUserRole.ADMIN])
    expect(await guard.canActivate(makeContext(null))).toBe(false)
  })

  it('allows access when user has required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([EnumUserRole.EMPLOYER])
    const result = await guard.canActivate(makeContext({ role: EnumUserRole.EMPLOYER }))
    expect(result).toBe(true)
  })

  it('throws ForbiddenException when user lacks required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([EnumUserRole.ADMIN])
    await expect(guard.canActivate(makeContext({ role: EnumUserRole.WORKER }))).rejects.toThrow(ForbiddenException)
  })
})
