import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from './health.controller'
import { PrismaService } from 'src/prisma.service'
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'

const mockPrisma = { $queryRaw: jest.fn() }
const mockRedis = { isOpen: true, ping: jest.fn(), connect: jest.fn() }

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile()
    controller = module.get<HealthController>(HealthController)
  })

  it('returns ok when DB and Redis are healthy', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
    mockRedis.ping.mockResolvedValue('PONG')
    const result = await controller.getHealth()
    expect(result.status).toBe('ok')
    expect(result.services.database).toBe('ok')
    expect(result.services.redis).toBe('ok')
    expect(result.timestamp).toBeDefined()
    expect(typeof result.uptime).toBe('number')
  })

  it('returns degraded when DB is down', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB connection failed'))
    mockRedis.ping.mockResolvedValue('PONG')
    const result = await controller.getHealth()
    expect(result.status).toBe('degraded')
    expect(result.services.database).toBe('error')
    expect(result.services.redis).toBe('ok')
  })

  it('returns degraded when Redis is down', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([])
    mockRedis.ping.mockRejectedValue(new Error('Redis offline'))
    const result = await controller.getHealth()
    expect(result.status).toBe('degraded')
    expect(result.services.redis).toBe('error')
  })

  it('connects Redis when not open', async () => {
    mockRedis.isOpen = false
    mockPrisma.$queryRaw.mockResolvedValue([])
    mockRedis.connect.mockResolvedValue(undefined)
    mockRedis.ping.mockResolvedValue('PONG')
    const result = await controller.getHealth()
    expect(mockRedis.connect).toHaveBeenCalled()
    expect(result.services.redis).toBe('ok')
    mockRedis.isOpen = true
  })
})
