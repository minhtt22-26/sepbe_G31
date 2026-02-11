import { Injectable } from "@nestjs/common";
import { HelperService } from "src/common/helper/service/helper.service";
import { EnumUserLoginWith, User } from "src/generated/prisma/client";
import { AuthUtil } from "../utils/auth.utils";
import { IAuthAccessTokenGenerate, IAuthAccessTokenPayload, IAuthRefreshTokenPayload } from "../interfaces/auth.interface";



@Injectable()
export class AuthService {
  constructor(
    private readonly authUtil: AuthUtil,
    private readonly helperService: HelperService,
  ) { }

  createTokens(
    user: User,
    loginWith: EnumUserLoginWith
  ): IAuthAccessTokenGenerate {
    const lastLoginAt = this.helperService.dateCreate()
    const jti = this.helperService.randomString(32)
    const sessionId = this.helperService.randomString(24)

    const accessTokenPayload: IAuthAccessTokenPayload =
      this.authUtil.createAccessTokenPayload(user, sessionId, lastLoginAt, loginWith)

    const accessToken = this.authUtil.createAccessTokens(jti, accessTokenPayload)

    const refreshTokenPayload: IAuthRefreshTokenPayload =
      this.authUtil.createRefreshTokenPayload(accessTokenPayload)

    const refreshToken = this.authUtil.createRefreshTokens(jti, refreshTokenPayload)

    return {
      tokens: {
        tokenType: this.authUtil.jwtPrefix,
        expiredIn: this.authUtil.jwtAccessTokenExpirationTimeInSeconds,
        accessToken,
        refreshToken
      },
      jti,
      sessionId
    }
  }
}
