import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { PrismaModule } from 'src/prisma.module'
import { RedisModule } from 'src/infrastructure/redis/redis.module'

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
