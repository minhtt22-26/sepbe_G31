import { SetMetadata } from '@nestjs/common';
import { EnumUserRole } from 'src/generated/prisma/enums';

export const AUTH_ROLE_META_KEY = 'auth_role_meta_key';
export const AuthRoles = (...roles: EnumUserRole[]) => SetMetadata(AUTH_ROLE_META_KEY, roles);
