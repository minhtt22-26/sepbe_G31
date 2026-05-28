import { Test, TestingModule } from '@nestjs/testing'
import { SessionRepository } from './session.repository'
import { PrismaService } from 'src/prisma.service'

const mockPrisma: any = {
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
}

describe('SessionRepository', () => {
  let repo: SessionRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    repo = module.get<SessionRepository>(SessionRepository)
  })

  it('create delegates to prisma', async () => {
    mockPrisma.session.create.mockResolvedValue({ id: 'sess-1' })
    const result = await repo.create({ id: 'sess-1', userId: 1, jti: 'jti', expiredAt: new Date() })
    expect(result).toEqual({ id: 'sess-1' })
  })

  it('findByUserAndSession finds non-revoked session', async () => {
    mockPrisma.session.findFirst.mockResolvedValue({ jti: 'abc', expiredAt: new Date() })
    const result = await repo.findByUserAndSession(1, 'sess-1')
    expect(result?.jti).toBe('abc')
    expect(mockPrisma.session.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'sess-1', userId: 1, isRevoked: false }) }),
    )
  })

  it('findByUserAndSession returns null when not found', async () => {
    mockPrisma.session.findFirst.mockResolvedValue(null)
    expect(await repo.findByUserAndSession(1, 'ghost')).toBeNull()
  })

  it('updateLogin updates jti and expiredAt', async () => {
    mockPrisma.session.update.mockResolvedValue({})
    await repo.updateLogin({ id: 'sess-1', userId: 1, jti: 'new-jti', expiredAt: new Date() })
    expect(mockPrisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ jti: 'new-jti' }) }),
    )
  })

  it('findAll returns active sessions for user', async () => {
    mockPrisma.session.findMany.mockResolvedValue([{ id: 'sess-1' }])
    const result = await repo.findAll(1)
    expect(result).toHaveLength(1)
    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 1, isRevoked: false }) }),
    )
  })

  it('revoke marks session as revoked', async () => {
    mockPrisma.session.update.mockResolvedValue({ id: 'sess-1', isRevoked: true })
    await repo.revoke(1, 'sess-1')
    expect(mockPrisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isRevoked: true }) }),
    )
  })

  it('revokeAll marks all user sessions as revoked', async () => {
    mockPrisma.session.updateMany.mockResolvedValue({ count: 3 })
    await repo.revokeAll(1)
    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 }, data: expect.objectContaining({ isRevoked: true }) }),
    )
  })
})
