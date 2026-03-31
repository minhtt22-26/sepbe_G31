import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRepository } from '../../modules/users/repositories/user.repository';
import { EnumUserStatus } from 'src/generated/prisma/client';

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private readonly userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user is attached, it's a guest or unauthenticated request
    // According to requirements: Guest -> allowed
    if (!user || !user.userId) {
      return true;
    }

    // If user is logged in, check their status in the database
    const userData = await this.userRepository.findOneById(user.userId);
    
    // If user not found in DB but has a token, it might be an edge case
    if (!userData) {
        return true;
    }

    if (userData.status === EnumUserStatus.DELETED) {
      throw new ForbiddenException({
        message: 'Tài khoản đã bị xóa. Vui lòng liên hệ quản trị viên.',
        errorCode: 'USER_DELETED',
      });
    }

    return true;
  }
}
