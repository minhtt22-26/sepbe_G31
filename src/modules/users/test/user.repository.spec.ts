import { UserRepository } from '../repositories/user.repository'
import { PrismaService } from 'src/prisma.service'
import { HelperService } from 'src/common/helper/service/helper.service'
import { EnumUserRole, EnumUserStatus } from 'src/generated/prisma/enums'

describe('UserRepository', () => {
  let repository: UserRepository

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
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

      await repository.getUserList({
        page: 1,
        role: EnumUserRole.ADMIN,
      })

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { role: { not: EnumUserRole.ADMIN } },
              { role: EnumUserRole.ADMIN },
            ],
          },
        }),
      )
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { role: { not: EnumUserRole.ADMIN } },
            { role: EnumUserRole.ADMIN },
          ],
        },
      })
    })
  })
})
