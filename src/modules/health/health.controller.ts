import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'
import { PrismaService } from 'src/prisma.service'
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'
import type { RedisClientType } from 'redis'

interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  uptime: number
  services: {
    database: 'ok' | 'error'
    redis: 'ok' | 'error'
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — database & Redis status' })
  async getHealth(): Promise<HealthResponse> {
    let database: 'ok' | 'error' = 'ok'
    let redis: 'ok' | 'error' = 'ok'

    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch {
      database = 'error'
    }

    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect()
      }
      await this.redisClient.ping()
    } catch {
      redis = 'error'
    }

    const status: 'ok' | 'degraded' =
      database === 'ok' && redis === 'ok' ? 'ok' : 'degraded'

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: { database, redis },
    }
  }
}
