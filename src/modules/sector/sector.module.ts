import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma.module'
import { SectorController } from './controller/sector.controller'
import { SectorService } from './service/sector.service'
import { SectorRepository } from './repositories/sector.repository'
import { AuthModule } from '../auth/auth.module'
import { RedisModule } from 'src/infrastructure/redis/redis.module'

@Module({
    imports: [PrismaModule, AuthModule, RedisModule],
    controllers: [SectorController],
    providers: [SectorService, SectorRepository],
    exports: [SectorService],
})
export class SectorModule { }
