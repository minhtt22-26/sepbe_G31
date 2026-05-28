import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { SessionService } from './session.service'
import { SessionRepository } from '../repositories/session.repository'
import { SessionUtil } from '../utils/session.util'

const mockSessionUtil = { toNumberId: jest.fn((id: any) => Number(id)) }
const mockSessionRepo = {
  create: jest.fn(),
  findByUserAndSession: jest.fn(),
  updateLogin: jest.fn(),
  findAll: jest.fn(),
  revoke: jest.fn(),
  revokeAll: jest.fn(),
}

describe('SessionService', () => {
  let service: SessionService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionUtil, useValue: mockSessionUtil },
        { provide: SessionRepository, useValue: mockSessionRepo },
      ],
    }).compile()

    service = module.get<SessionService>(SessionService)
  })

  it('create delegates to repository', async () => {
    mockSessionRepo.create.mockResolvedValue({ id: 'sess-1' })
    const result = await service.create({ userId: 1, jti: 'jti', sessionId: 'sid', expiredAt: new Date(), loginWith: 'CREDENTIAL' } as any)
    expect(result).toEqual({ id: 'sess-1' })
  })

  it('getLogin returns jti and expiredAt when session found', async () => {
    mockSessionRepo.findByUserAndSession.mockResolvedValue({ jti: 'abc', expiredAt: new Date() })
    const result = await service.getLogin(1, 'sess-1')
    expect(result?.jti).toBe('abc')
  })

  it('getLogin returns null when session not found', async () => {
    mockSessionRepo.findByUserAndSession.mockResolvedValue(null)
    expect(await service.getLogin(1, 'sess-1')).toBeNull()
  })

  it('updateLogin delegates to repository', async () => {
    mockSessionRepo.updateLogin.mockResolvedValue(undefined)
    await service.updateLogin({ userId: 1, jti: 'jti', sessionId: 'sid', expiredAt: new Date(), loginWith: 'CREDENTIAL' } as any)
    expect(mockSessionRepo.updateLogin).toHaveBeenCalled()
  })

  it('getList returns transformed sessions', async () => {
    mockSessionRepo.findAll.mockResolvedValue([])
    const result = await service.getList(1)
    expect(Array.isArray(result)).toBe(true)
  })

  it('revoke throws NotFoundException when session not found', async () => {
    mockSessionRepo.findByUserAndSession.mockResolvedValue(null)
    await expect(service.revoke(1, 'sess-1')).rejects.toThrow(NotFoundException)
  })

  it('revoke calls repository when session found', async () => {
    mockSessionRepo.findByUserAndSession.mockResolvedValue({ jti: 'abc' })
    mockSessionRepo.revoke.mockResolvedValue(undefined)
    await service.revoke(1, 'sess-1')
    expect(mockSessionRepo.revoke).toHaveBeenCalledWith(1, 'sess-1')
  })

  it('revokeAll delegates to repository', async () => {
    mockSessionRepo.revokeAll.mockResolvedValue(undefined)
    await service.revokeAll(1)
    expect(mockSessionRepo.revokeAll).toHaveBeenCalledWith(1)
  })
})
