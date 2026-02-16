import { Injectable, UnauthorizedException } from "@nestjs/common";
import { HelperService } from "src/common/helper/service/helper.service";
import { EnumUserLoginWith, User } from "src/generated/prisma/client";
import { AuthUtil } from "../utils/auth.utils";
import { IAuthAccessTokenGenerate, IAuthAccessTokenPayload, IAuthRefreshTokenGenerate, IAuthRefreshTokenPayload, IAuthSocialPayload } from "../interfaces/auth.interface";
import { SessionService } from "src/modules/session/service/session.service";
import { AuthTokenResponseDto } from "../dto/response/auth.response.token.dto";



@Injectable()
export class AuthService {
  constructor(
    private readonly authUtil: AuthUtil,
    private readonly helperService: HelperService,
    private readonly sessionService: SessionService,
  ) { }

  createTokens(
    user: User,
    loginWith: EnumUserLoginWith
  ): IAuthAccessTokenGenerate {
    const lastLoginAt = this.helperService.dateCreate()
    const jti = this.authUtil.generateJti()
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

  refreshTokens(
    user: User,
    refreshTokenFromRequest: string
  ): IAuthRefreshTokenGenerate {

    const {
      sessionId,
      loginWith,
      lastLoginAt,
      exp: oldExp,
    } = this.authUtil.payloadToken<IAuthRefreshTokenPayload>(
      refreshTokenFromRequest)

    const jti = this.authUtil.generateJti()

    const payloadAccessToken: IAuthAccessTokenPayload =
      this.authUtil.createAccessTokenPayload(
        user,
        sessionId,
        lastLoginAt,
        loginWith,
      )

    const accessToken: string = this.authUtil.createAccessTokens(
      jti,
      payloadAccessToken
    )

    const newpayloadRefreshToken: IAuthRefreshTokenPayload =
      this.authUtil.createRefreshTokenPayload(
        payloadAccessToken
      )

    //Tính thời gian còn lại của refresh token cũ
    const today = this.helperService.dateCreate()

    const expiredAt = this.helperService.dateCreateFromTimestamp(
      oldExp! * 1000
    )

    const newRefreshTokenExpired = this.helperService.dateDriff(
      expiredAt,
      today
    )

    const newRefreshTokenExpireInseconds =
      newRefreshTokenExpired && newRefreshTokenExpired.seconds ?
        newRefreshTokenExpired.seconds : Math.floor(newRefreshTokenExpired.miliseconds / 1000)

    const newRefreshToken: string = this.authUtil.createRefreshTokens(
      jti,
      newpayloadRefreshToken,
      newRefreshTokenExpireInseconds,
    )

    const tokens: AuthTokenResponseDto = {
      tokenType: this.authUtil.jwtPrefix,
      expiredIn: this.authUtil.jwtAccessTokenExpirationTimeInSeconds,
      accessToken,
      refreshToken: newRefreshToken
    }

    return {
      tokens,
      jti,
      sessionId,
      expiredInMs: newRefreshTokenExpired.miliseconds
    }

  }

  //Validate Strategy
  async validateJwtAccessStrategy(
    payload: IAuthAccessTokenPayload
  ): Promise<IAuthAccessTokenPayload> {

    const { userId, sessionId, jti } = payload

    if (!userId || !sessionId || !jti) {
      throw new UnauthorizedException({
        message: "Invalid token payload"
      })
    }

    const session = await this.sessionService.getLogin(
      userId,
      sessionId,
    )


    if (!session) {
      throw new UnauthorizedException({
        message: "Session not found or invalid"
      })
    }

    if (session.jti !== payload.jti) {
      throw new UnauthorizedException({
        message: "Jti not match"
      })
    }

    return payload
  }

  async validateJwtRefreshStrategy(
    payload: IAuthRefreshTokenPayload
  ): Promise<IAuthRefreshTokenPayload> {

    const { userId, sessionId, jti } = payload

    if (!userId || !sessionId || !jti) {
      throw new UnauthorizedException({
        message: "Invalid refresh token payload"
      })
    }

    const session = await this.sessionService.getLogin(
      userId,
      sessionId,
    )


    if (!session) {
      throw new UnauthorizedException({
        message: "Refresh token invalid"
      })
    }

    if (session.jti !== payload.jti) {
      throw new UnauthorizedException({
        message: "Refresh token tampered"
      })
    }

    return payload
  }

  async validateJwtAccessGuard(
    err: Error,
    user: IAuthAccessTokenPayload,
    info: Error,
  ): Promise<IAuthAccessTokenPayload> {

    console.log(err)
    if (err || !user) {
      throw new UnauthorizedException({
        message: "Access token invalid",
        error: err?.message || info?.message || "Unknow error"
      })
    }

    return user
  }

  async validateJwtRefreshGuard(
    err: Error,
    user: IAuthRefreshTokenPayload,
    info: Error,
  ): Promise<IAuthRefreshTokenPayload> {

    console.log(err)
    if (err || !user) {
      throw new UnauthorizedException({
        message: "Refresh token invalid",
        error: err?.message || info?.message || "Unknow error"
      })
    }

    return user
  }

  async validateOAuthGoogleGuard(request: any): Promise<boolean> {
    const requestHeaders = this.authUtil.extractHeaderGoogle(request);

    if (requestHeaders.length !== 2) {
      throw new UnauthorizedException({
        message: 'Google token required',
      });
    }

    try {
      const payload = await this.authUtil.verifyGoogle(requestHeaders[1]);

      request.user = {
        email: payload.email,
        emailVerified: payload.email_verified,
      } as IAuthSocialPayload;

      return true;
    } catch (err: unknown) {
      console.log(err)
      throw new UnauthorizedException({
        message: 'Invalid Google token',
      });
    }
  }
}
