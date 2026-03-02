import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma.module'
import { SectorController } from './controller/sector.controller'
import { SectorService } from './service/sector.service'
import { SectorRepository } from './repositories/sector.repository'

@Module({
    imports: [PrismaModule],
    controllers: [SectorController],
    providers: [SectorService, SectorRepository],
    exports: [SectorService],
})
export class SectorModule { }
