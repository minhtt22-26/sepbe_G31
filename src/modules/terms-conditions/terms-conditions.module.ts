import { Module } from '@nestjs/common'
import { TermsConditionsController } from './controller/terms-conditions.controller'
import { TermsConditionsService } from './service/terms-conditions.service'
import { TermsConditionsRepository } from './repositories/terms-conditions.repository'
import { PrismaModule } from 'src/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [TermsConditionsController],
    providers: [TermsConditionsService, TermsConditionsRepository],
    exports: [TermsConditionsService],
})
export class TermsConditionsModule { }
