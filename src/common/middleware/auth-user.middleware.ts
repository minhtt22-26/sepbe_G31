import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AuthUtil } from '../../modules/auth/utils/auth.utils';

@Injectable()
export class AuthUserMiddleware implements NestMiddleware {
  constructor(private readonly authUtil: AuthUtil) {}

  async use(req: any, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.authUtil.verifyAccessToken(token);
        req.user = payload;
      } catch (error) {
        // If JWT is invalid, we don't attach anything and treat as guest
      }
    }
    next();
  }
}
