import { forwardRef, Module } from '@nestjs/common'
import { UserController } from './controller/user.controller'
import { UserService } from './service/user.service'
import { UserRepository } from './repositories/user.repository'
import { AuthModule } from '../auth/auth.module'
import { HelperModule } from 'src/common/helper/helper.module'
import { SessionModule } from '../session/session.module'
import { EmailModule } from '../../infrastructure/email/email.module'
import { CloudinaryModule } from 'src/infrastructure/cloudinary/cloudinary.module'
import { AIMatchingModule } from '../ai-matching/ai-matching.module'

@Module({
  imports: [
    AuthModule,
    HelperModule,
    SessionModule,
    EmailModule,
    CloudinaryModule,
    forwardRef(() => AIMatchingModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
