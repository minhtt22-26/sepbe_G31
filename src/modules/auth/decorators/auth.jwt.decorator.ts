import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UseGuards,
} from '@nestjs/common'
import { AuthJwtAccessGuard } from '../guards/jwt/auth.jwt.access.guards'
import { AuthJwtRefreshGuard } from '../guards/jwt/auth.jwt.refresh.guards'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { AuthRoles } from './auth.role.decorator'
import { AuthRoleGuard } from '../guards/role/auth.role.guard'

//Bảo vệ route với access token
export function AuthJwtAccessProtected(): MethodDecorator {
  return applyDecorators(UseGuards(AuthJwtAccessGuard))
}

export function AuthJwtRefreshProtected(): MethodDecorator {
  return applyDecorators(UseGuards(AuthJwtRefreshGuard))
}

export function AuthRoleProtected(...roles: EnumUserRole[]): MethodDecorator {
  return applyDecorators(
    AuthJwtAccessProtected(),
    AuthRoles(...roles),
    UseGuards(AuthRoleGuard),
  )
}

export const AuthJwtPayload = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()

    const user = request.user
    //console.log('user from jwt payload decorator', user)
    return field ? user?.[field] : user
  },
)

export const AuthJwtToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    const authorization = request.headers.authorization

    if (!authorization) return ''
    const [, token] = authorization.split(' ')

    return token
  },
)
