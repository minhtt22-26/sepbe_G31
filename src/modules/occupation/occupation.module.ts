import { Module } from '@nestjs/common'
import { OccupationController } from './controller/occupation.controller'
import { OccupationService } from './service/occupation.service'
import { OccupationRepository } from './repositories/occupation.repository'
import { PrismaModule } from 'src/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [OccupationController],
    providers: [OccupationService, OccupationRepository],
    exports: [OccupationService],
})
export class OccupationModule { }
