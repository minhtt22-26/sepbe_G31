import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthJwtAccessGuardKey } from '../../constants/auth.constant'
import { AuthService } from '../../service/auth.service'
import { IAuthAccessTokenPayload } from '../../interfaces/auth.interface'

@Injectable()
export class AuthJwtAccessGuard extends AuthGuard(AuthJwtAccessGuardKey) {
  constructor(private readonly authService: AuthService) {
    super()
  }

  // @ts-expect-error: signature mismatch from NestJS AuthGuard handleRequest
  async handleRequest(
    err: any,
    user: IAuthAccessTokenPayload,
    info: any,
  ): Promise<IAuthAccessTokenPayload> {
    return await this.authService.validateJwtAccessGuard(err, user, info)
  }
}
