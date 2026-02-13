import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthJwtAccessGuardKey } from "../constants/auth.constant";
import { AuthService } from "../service/auth.service";
import { IAuthAccessTokenPayload } from "../interfaces/auth.interface";

@Injectable()
export class AuthJwtAccessGuard extends
    AuthGuard(AuthJwtAccessGuardKey) {

    constructor(
        private readonly authService: AuthService,
    ) {
        super()
    }

    handleRequest<T = IAuthAccessTokenPayload>(
        err: Error,
        user: IAuthAccessTokenPayload,
        info: Error,
    ): T {
        return this.authService.validateJwtAccessGuard(err, user, info) as T
    }


}