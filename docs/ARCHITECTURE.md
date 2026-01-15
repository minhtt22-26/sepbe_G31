# Architecture (NestJS + Prisma)

## Goals

- Feature-first modules for parallel team development.
- Clear boundaries: controllers (HTTP) → services (business) → prisma (data).
- Consistent config/env management via `@nestjs/config`.

## Folder structure

```
src/
  common/
    config/
      validate-env.ts
  config/
    app.config.ts
    jwt.config.ts
  modules/
    auth/
    users/
    health/
  prisma/
    prisma.module.ts
    prisma.service.ts
  shared/
    types/
    utils/
```

## Module rules

- Each feature lives in `src/modules/<feature>`.
- Only feature services talk to `PrismaService`.
- Controllers are thin: validate inputs, call service, return DTO.

## Prisma rules

- Schema: `prisma/schema.prisma`.
- Migrations are committed.
- `prisma/seed.ts` is idempotent (use upsert).

## Configuration

- `.env` is loaded by `ConfigModule.forRoot()`.
- Required vars are validated in `src/common/config/validate-env.ts`.
