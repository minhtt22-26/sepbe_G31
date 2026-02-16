import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../../service/auth.service';

@Injectable()
export class AuthSocialGoogleGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        return this.authService.validateOAuthGoogleGuard(request);
    }
}