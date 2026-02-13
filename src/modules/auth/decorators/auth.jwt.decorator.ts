import { applyDecorators, createParamDecorator, ExecutionContext, UseGuards } from "@nestjs/common";
import { AuthJwtAccessGuard } from "../guards/auth.jwt.access.guards";


//Bảo vệ route với access token
export function AuthJwtAccessProtected(): MethodDecorator {
    return applyDecorators(UseGuards(AuthJwtAccessGuard))
}

//Bảo vệ route với refresh token

//Extract JWT payload từ request
export const AuthJwtPayload = createParamDecorator(
    (field: string | undefined,
        ctx: ExecutionContext
    ) => {
        const request = ctx.switchToHttp().getRequest()

        console.log(request)
        const user = request.user;

        return field ? user?.[field] : user
    }
)

//Extract JWT Token string từ header
export const AuthJwtToken = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        const authorization = request.headers.authorization;

        if (!authorization)
            return ''
        const [, token] = authorization.split(' ')

        return token
    }
)