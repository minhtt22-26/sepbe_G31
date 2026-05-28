import { Test, TestingModule } from '@nestjs/testing'
import { SessionTestController } from './session.controller'
import { SessionService } from '../service/session.service'

const mockSessionService = {
  create: jest.fn(),
  getList: jest.fn(),
  revoke: jest.fn(),
}

describe('SessionTestController', () => {
  let controller: SessionTestController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionTestController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    }).compile()
    controller = module.get<SessionTestController>(SessionTestController)
  })

  it('testCreate creates a session and returns success', async () => {
    mockSessionService.create.mockResolvedValue({
      id: 'sess-123',
      userId: 1,
      expiredAt: new Date(),
    })
    const result = await controller.testCreate()
    expect(result.success).toBe(true)
    expect(result.session.id).toBe('sess-123')
    expect(mockSessionService.create).toHaveBeenCalled()
  })

  it('list returns sessions for the user', async () => {
    mockSessionService.getList.mockResolvedValue([{ id: 'sess-1' }])
    const result = await controller.list(1)
    expect(mockSessionService.getList).toHaveBeenCalledWith(1)
    expect(result).toHaveLength(1)
  })

  it('revoke calls session service with userId and sessionId', async () => {
    mockSessionService.revoke.mockResolvedValue(undefined)
    await controller.revoke('sess-abc', 1)
    expect(mockSessionService.revoke).toHaveBeenCalledWith(1, 'sess-abc')
  })
})
