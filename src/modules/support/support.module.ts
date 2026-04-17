import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from 'src/prisma.module'
import { SupportController } from './controller/support.controller'
import { SupportRepository } from './repositories/support.repository'
import { SupportService } from './service/support.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SupportController],
  providers: [SupportService, SupportRepository],
  exports: [SupportService],
})
export class SupportModule {}
