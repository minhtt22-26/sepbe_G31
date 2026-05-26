import { Module } from '@nestjs/common'
import { OccupationController } from './controller/occupation.controller'
import { OccupationService } from './service/occupation.service'
import { OccupationRepository } from './repositories/occupation.repository'
import { PrismaModule } from 'src/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { RedisModule } from 'src/infrastructure/redis/redis.module'

@Module({
    imports: [PrismaModule, AuthModule, RedisModule],
    controllers: [OccupationController],
    providers: [OccupationService, OccupationRepository],
    exports: [OccupationService],
})
export class OccupationModule { }
