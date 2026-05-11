import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { CompanyModule } from '../company/company.module'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'

@Module({
  imports: [PrismaModule, AuthModule, CompanyModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
