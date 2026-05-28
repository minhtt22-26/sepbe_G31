import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException } from '@nestjs/common'
import { UserStatusGuard } from './user-status.guard'
import { UserRepository } from 'src/modules/users/repositories/user.repository'
import { EnumUserStatus } from 'src/generated/prisma/client'

const mockUserRepo = { findOneById: jest.fn() }

function makeContext(user: any): any {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }
}

describe('UserStatusGuard', () => {
  let guard: UserStatusGuard

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStatusGuard,
        { provide: UserRepository, useValue: mockUserRepo },
      ],
    }).compile()
    guard = module.get<UserStatusGuard>(UserStatusGuard)
  })

  it('allows guest (no user on request)', async () => {
    expect(await guard.canActivate(makeContext(null))).toBe(true)
    expect(await guard.canActivate(makeContext({ userId: null }))).toBe(true)
  })

  it('allows active user', async () => {
    mockUserRepo.findOneById.mockResolvedValue({ status: EnumUserStatus.ACTIVE })
    expect(await guard.canActivate(makeContext({ userId: 1 }))).toBe(true)
  })

  it('allows when user not found in DB', async () => {
    mockUserRepo.findOneById.mockResolvedValue(null)
    expect(await guard.canActivate(makeContext({ userId: 99 }))).toBe(true)
  })

  it('throws ForbiddenException for deleted user', async () => {
    mockUserRepo.findOneById.mockResolvedValue({ status: EnumUserStatus.DELETED })
    await expect(guard.canActivate(makeContext({ userId: 5 }))).rejects.toThrow(ForbiddenException)
  })
})
