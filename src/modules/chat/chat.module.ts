import { Module } from '@nestjs/common'
import { ChatController } from './controller/chat.controller'
import { ChatService } from './service/chat.service'
import { ChatRepository } from './repositories/chat.repository'
import { PrismaModule } from 'src/prisma.module'
import { UserModule } from '../users/user.module'
import { HelperModule } from 'src/common/helper/helper.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, UserModule, HelperModule, AuthModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRepository,
  ],
  exports: [ChatService],
})
export class ChatModule {}
