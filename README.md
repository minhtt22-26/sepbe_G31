# SEP Backend (`sepbe_G31`)

Backend service for SEP project, built with NestJS + Prisma + PostgreSQL.

## Tech stack

- NestJS 11
- Prisma 7
- PostgreSQL 16
- Redis cache (`cache-manager` + `cache-manager-redis-store`)
- JWT auth (access/refresh)
- Swagger OpenAPI

## Current modules

- `auth`
- `users`
- `session`
- `company`
- `job`
- `occupation`
- `sector`
- `notifications`
- `health`
- `queue-test`

## Project structure

```text
src/
  common/            # guards, filters, interceptors, decorators, utils
  config/            # app/auth/email env config + validation
  infrastructure/    # cloudinary, email, queue, redis integrations
  modules/           # feature-first modules
  generated/prisma/  # generated prisma client output
  main.ts
prisma/
  schema.prisma
docs/
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (recommended for local Postgres)
- Redis instance (local Docker or managed)

## Environment setup

1. Copy env template:

```bash
cp .env.example .env
```

Windows PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

2. Fill required values in `.env`:

- `NODE_ENV`
- `APP_PORT`
- `APP_API_PREFIX`
- `DATABASE_URL`
- `REDIS_URL`
- JWT settings (`AUTH_JWT_*`)
- email settings (`EMAIL_*`)
- cloudinary settings (`CLOUDINARY_*`)

Note:
- `APP_PORT` defaults to `4000` in `.env.example`.
- API docs are served at `/{APP_API_PREFIX}/docs`.

## Run dependencies

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d
```

`docker-compose.yml` creates:
- Postgres: `localhost:5432`
- DB: `sepbe`
- User/Pass: `postgres/postgres`

If you need local Redis quickly:

```bash
docker run -d --name sepbe-redis -p 6379:6379 redis:7
```

Then set:

```env
REDIS_URL=redis://localhost:6379
```

## Install and run

```bash
npm install
```

Generate Prisma client (also runs automatically after `npm install`):

```bash
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate dev
```

Start app:

```bash
# development
npm run start:dev

# production build
npm run build
npm run start:prod
```

Default URLs (from `.env.example`):

- API base: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`

## Available scripts

```bash
npm run start
npm run start:dev
npm run start:debug
npm run build
npm run start:prod
npm run lint
npm run format
npm run test
npm run test:e2e
npm run test:cov
```

## API behavior notes

- Global prefix is read from `APP_API_PREFIX`.
- Global validation pipe is enabled (`whitelist`, `transform`).
- Global response interceptor and exception filter are enabled.
- CORS uses `CORS_ORIGIN`.

## Useful docs in repo

- `docs/ARCHITECTURE.md`
- `docs/WORKFLOW.md`
- `docs/PLAN_16_WEEKS.md`