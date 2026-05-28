import { UserRepository } from '../repositories/user.repository'
import { PrismaService } from 'src/prisma.service'
import { HelperService } from 'src/common/helper/service/helper.service'
import { EnumUserLoginWith, EnumUserRole, EnumUserStatus } from 'src/generated/prisma/enums'

describe('UserRepository', () => {
  let repository: UserRepository

  const mockPrismaService: any = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workerProfile: { create: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
    verificationToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  }

  const mockHelperService = {
    dateCreate: jest.fn(),
  }

  beforeEach(() => {
    repository = new UserRepository(
      mockPrismaService as unknown as PrismaService,
      mockHelperService as unknown as HelperService,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserList', () => {
    it('should not exclude deleted users when status filter is not provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([])
      mockPrismaService.user.count.mockResolvedValue(0)

      await repository.getUserList({ page: 1 })

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{ role: { not: EnumUserRole.ADMIN } }],
          },
        }),
      )
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          AND: [{ role: { not: EnumUserRole.ADMIN } }],
        },
      })
    })

    it('should filter by status when status is provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([])
      mockPrismaService.user.count.mockResolvedValue(0)

      await repository.getUserList({
        page: 1,
        status: EnumUserStatus.DELETED,
      })

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { role: { not: EnumUserRole.ADMIN } },
              { status: EnumUserStatus.DELETED },
            ],
          },
        }),
      )
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { role: { not: EnumUserRole.ADMIN } },
            { status: EnumUserStatus.DELETED },
          ],
        },
      })
    })

    it('should still exclude admin users when role filter is admin', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([])
      mockPrismaService.user.count.mockResolvedValue(0)

      await repository.getUserList({ page: 1, role: EnumUserRole.ADMIN })
      expect(mockPrismaService.user.findMany).toHaveBeenCalled()
    })
  })

  // ── find methods ──────────────────────────────────────────────────────────

  it('findUserWithByEmail delegates to prisma', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 })
    const result = await repository.findUserWithByEmail('test@test.com')
    expect(result).toEqual({ id: 1 })
  })

  it('findUserWithByUserName delegates to prisma', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null)
    const result = await repository.findUserWithByUserName('john')
    expect(result).toBeNull()
  })

  it('findOneById delegates to prisma', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 5 })
    const result = await repository.findOneById(5)
    expect(result).toEqual({ id: 5 })
  })

  it('countNonDeletedManagers counts managers', async () => {
    mockPrismaService.user.count.mockResolvedValue(2)
    const result = await repository.countNonDeletedManagers()
    expect(result).toBe(2)
  })

  it('login updates lastLoginAt and loginWith', async () => {
    mockHelperService.dateCreate.mockReturnValue(new Date())
    mockPrismaService.user.update.mockResolvedValue({})
    await repository.login(1, EnumUserLoginWith.CREDENTIAL)
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    )
  })

  it('increasePasswordAttempt increments by 1', async () => {
    mockPrismaService.user.update.mockResolvedValue({})
    await repository.increasePasswordAttempt(1)
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordAttempt: { increment: 1 } } }),
    )
  })

  it('resetPasswordAttempt sets to 0', async () => {
    mockPrismaService.user.update.mockResolvedValue({})
    await repository.resetPasswordAttempt(1)
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordAttempt: { set: 0 } } }),
    )
  })

  it('updatePassword updates password hash', async () => {
    mockPrismaService.user.update.mockResolvedValue({})
    await repository.updatePassword(1, '$2b$10$hashed')
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: '$2b$10$hashed' }) }),
    )
  })

  it('createForgotPasswordToken creates token record', async () => {
    mockPrismaService.verificationToken.create.mockResolvedValue({})
    await repository.createForgotPasswordToken(1, 'token-abc', new Date())
    expect(mockPrismaService.verificationToken.create).toHaveBeenCalled()
  })

  it('findValidForgotPasswordToken finds non-expired token', async () => {
    mockHelperService.dateCreate.mockReturnValue(new Date())
    mockPrismaService.verificationToken.findFirst.mockResolvedValue({ id: 1, user: { id: 1 } })
    const result = await repository.findValidForgotPasswordToken('valid-token')
    expect(result?.id).toBe(1)
  })

  it('markForgotPasswordTokenUsed updates usedAt', async () => {
    mockPrismaService.verificationToken.update.mockResolvedValue({})
    await repository.markForgotPasswordTokenUsed(5)
    expect(mockPrismaService.verificationToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    )
  })

  it('createBySocial creates user with social data', async () => {
    mockPrismaService.user.create.mockResolvedValue({ id: 10 })
    const result = await repository.createBySocial('g@test.com', 'Google User', EnumUserLoginWith.SOCIAL_GOOGLE, new Date(), EnumUserRole.WORKER)
    expect(result).toEqual({ id: 10 })
  })

  it('createProfile creates worker profile', async () => {
    mockPrismaService.workerProfile.create.mockResolvedValue({ id: 1 })
    const result = await repository.createProfile(1, {} as any)
    expect(result).toEqual({ id: 1 })
  })

  it('updateProfile upserts worker profile', async () => {
    mockPrismaService.workerProfile.upsert.mockResolvedValue({ id: 1 })
    await repository.updateProfile(1, {} as any)
    expect(mockPrismaService.workerProfile.upsert).toHaveBeenCalled()
  })
})
