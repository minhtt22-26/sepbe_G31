import { Module } from '@nestjs/common'
import { PrismaModule } from 'src/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { CompanyModule } from '../company/company.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { ChatModule } from '../chat/chat.module'
import { InterviewInvitationService } from './service/interview-invitation.service'
import { InterviewInvitationRepository } from './repositories/interview-invitation.repository'
import { InterviewInvitationController } from './controller/interview-invitation.controller'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CompanyModule,
    NotificationsModule,
    ChatModule,
  ],
  controllers: [InterviewInvitationController],
  providers: [InterviewInvitationService, InterviewInvitationRepository],
  exports: [InterviewInvitationService, InterviewInvitationRepository],
})
export class InterviewInvitationModule {}
