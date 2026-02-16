import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthJwtRefreshGuardKey } from "../../../constants/auth.constant";
import { AuthService } from "../../../service/auth.service";
import { IAuthRefreshTokenPayload } from "../../../interfaces/auth.interface";

@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    AuthJwtRefreshGuardKey
) {

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('auth.jwt.refreshToken.secret')!,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>("auth.jwt.audience"),
                issuer: configService.get<string>("auth.jwt.issuer")
            }
        })
    }

    validate(payload: IAuthRefreshTokenPayload): Promise<IAuthRefreshTokenPayload> {
        return this.authService.validateJwtRefreshStrategy(payload)
    }

}