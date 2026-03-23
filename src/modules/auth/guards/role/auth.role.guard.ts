import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { AUTH_ROLE_META_KEY } from '../../decorators/auth.role.decorator'

@Injectable()
export class AuthRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<EnumUserRole[]>(
      AUTH_ROLE_META_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()

    if (!user) {
      return false
    }

    const hasRole = requiredRoles.includes(user.role)

    if (!hasRole) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền thực hiện hành động này',
      })
    }

    return true
  }
}
