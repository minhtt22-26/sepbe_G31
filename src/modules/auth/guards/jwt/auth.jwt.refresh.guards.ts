import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthJwtRefreshGuardKey } from "../../constants/auth.constant";
import { AuthService } from "../../service/auth.service";
import { IAuthAccessTokenPayload, IAuthRefreshTokenPayload } from "../../interfaces/auth.interface";

@Injectable()
export class AuthJwtRefreshGuard extends
    AuthGuard(AuthJwtRefreshGuardKey) {

    constructor(
        private readonly authService: AuthService,
    ) {
        super()
    }

    handleRequest<T = IAuthRefreshTokenPayload>(
        err: Error,
        user: IAuthRefreshTokenPayload,
        info: Error,
    ): T {
        return this.authService.validateJwtRefreshGuard(err, user, info) as T
    }


}