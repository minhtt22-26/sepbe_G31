import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthJwtAccessGuardKey } from "../../../constants/auth.constant";
import { AuthService } from "../../../service/auth.service";
import { IAuthAccessTokenPayload } from "../../../interfaces/auth.interface";

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    AuthJwtAccessGuardKey
) {

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('auth.jwt.accessToken.secret')!,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>("auth.jwt.audience"),
                issuer: configService.get<string>("auth.jwt.issuer")
            }
        })
    }

    validate(payload: IAuthAccessTokenPayload): Promise<IAuthAccessTokenPayload> {
        return this.authService.validateJwtAccessStrategy(payload)
    }

}