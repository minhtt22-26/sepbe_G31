# SEP Backend (`sepbe_G31`)

Backend service for the **SEP – Seeking Employment Platform** (WorkLink), built with NestJS + Prisma + PostgreSQL.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 (Supabase) |
| Queue | Bull + Redis (BullMQ-compatible) |
| Email | Nodemailer via `@nestjs-modules/mailer` (Gmail SMTP) |
| Auth | JWT access/refresh + Google OAuth2 (Passport) |
| Real-time | Socket.io |
| File upload | Cloudinary |
| AI | Gemini (embedding + LLM matching) |
| Payment | SePay (bank transfer QR) |
| API docs | Swagger OpenAPI |
| Scheduler | `@nestjs/schedule` (cron jobs) |
| Deploy | Railway |

## Modules

### Feature modules (`src/modules/`)

| Module | Description |
|---|---|
| `auth` | JWT login, refresh, Google OAuth, forgot/reset password |
| `users` | Worker & employer profile management |
| `session` | User session tracking |
| `company` | Company profile & management |
| `job` | Job posting, search, boost, application tracking |
| `occupation` | Job occupation/category |
| `sector` | Industry sector |
| `notifications` | In-app notifications |
| `chat` | Real-time messaging via Socket.io |
| `interview-invitation` | Interview campaign scheduling & reminder cron jobs |
| `ai-matching` | AI job-candidate matching with vector embeddings |
| `embedding` | Text embedding generation via Gemini |
| `wallet` | Point-based wallet, SePay QR checkout, payment webhook |
| `statistics` | Employer dashboard analytics |
| `admin` | Admin panel features |
| `support` | Support ticket management |
| `terms-conditions` | T&C management |
| `health` | Health check endpoint |
| `queue-test` | Dev/test endpoints for queue inspection |

### Infrastructure (`src/infrastructure/`)

| Module | Description |
|---|---|
| `email` | Nodemailer SMTP service |
| `queue` | Bull queue setup (email, payment, stats) |
| `queue/email` | Email queue — send transactional emails async |
| `queue/payment` | Payment webhook queue — async SePay webhook processing + DLQ alert |
| `queue/stats` | Stats pre-compute — nightly admin platform stats cache |
| `cloudinary` | File upload service |
| `redis` | Redis integration |

## Project structure

```
src/
  common/            # guards, filters, interceptors, decorators, utils
  config/            # app/auth/email/payment/embedding env configs + validation
  infrastructure/    # email, queue (email/payment/stats), cloudinary, redis
  modules/           # feature modules (see table above)
  generated/prisma/  # Prisma client (auto-generated, do not edit)
  prisma.service.ts
  main.ts
prisma/
  schema.prisma
  migrations/
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for local Postgres + Redis)
- Redis instance (local Docker or managed)
- Gmail account with **App Password** enabled (for email)

## Environment setup

1. Copy env template:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Fill required values in `.env`:

### Core

```env
NODE_ENV=production
APP_PORT=4000
APP_API_PREFIX=api
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### JWT

```env
AUTH_JWT_ACCESS_SECRET=
AUTH_JWT_ACCESS_TOKEN_EXPIRED=15m
AUTH_JWT_REFRESH_SECRET=
AUTH_JWT_REFRESH_TOKEN_EXPIRED=7d
AUTH_JWT_AUDIENCE=
AUTH_JWT_ISSUER=
FORGOT_PASSWORD_BASE_URL=https://yourdomain.com/auth/reset-password
```

### Email (Gmail SMTP)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # Gmail App Password (16 chars)
EMAIL_FROM=youremail@gmail.com        # Must match EMAIL_USER
```

> **Important:** `EMAIL_FROM` must be the same address as `EMAIL_USER`.
> Gmail does not allow sending from a different address than the authenticated account.
>
> To get an App Password: Google Account → Security → 2-Step Verification → App passwords.

### Cloudinary

```env
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
```

### Google OAuth

```env
AUTH_SOCIAL_GOOGLE_CLIENT_ID=
AUTH_SOCIAL_GOOGLE_CLIENT_SECRET=
```

### SePay (payment)

```env
SEPAY_BANK_CODE=            # e.g. ICB, VCB
SEPAY_ACCOUNT_NUMBER=
SEPAY_ACCOUNT_NAME=         # optional display name
SEPAY_WEBHOOK_API_KEY=      # secret to verify incoming webhooks
SEPAY_ORDER_PREFIX=SEVQR    # prefix in bank transfer note to match orders
SEPAY_WEBHOOK_URL=https://yourdomain.com/api/wallet/topup/sepay/webhook
```

### AI / Gemini

```env
GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_LLM_MODEL=gemini-2.5-flash-lite
GEMINI_LLM_TEMPERATURE=0
```

### Optional

```env
ADMIN_ALERT_EMAIL=admin@yourdomain.com   # Receives DLQ alert emails when payment jobs fail permanently
NODE_OPTIONS=--dns-result-order=ipv4first  # Recommended on Railway to fix DNS resolution
```

## Run dependencies

Start PostgreSQL + Redis with Docker Compose:

```bash
docker compose up -d
```

Or run Redis separately:

```bash
docker run -d --name sep-redis -p 6379:6379 redis:7
REDIS_URL=redis://localhost:6379
```

## Install and run

```bash
npm install
npx prisma generate
npx prisma migrate dev

# development (hot reload)
npm run start:dev

# production
npm run build && npm run start:prod
```

Default URLs:

- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`

## Available scripts

```bash
npm run start:dev     # development with hot reload
npm run build         # compile TypeScript
npm run start:prod    # run compiled build
npm run lint          # ESLint
npm run format        # Prettier
npm run test          # unit tests
npm run test:e2e      # end-to-end tests
npm run test:cov      # test coverage
```

## Queue system

The app uses **Bull + Redis** for async background jobs.

### Queues

| Queue | Purpose | Retries |
|---|---|---|
| `email-queue` | Send transactional emails (forgot password, etc.) | 3× exponential backoff |
| `payment-queue` | Process SePay webhook async — immediate 200 response to gateway | 5× exponential backoff |
| `stats-queue` | Nightly admin platform stats pre-compute → cached in `SystemSetting` | 3× exponential backoff |

### Payment webhook flow

```
SePay → POST /api/wallet/topup/sepay/webhook
  → validate auth header (401 if invalid)
  → queue job in Redis (returns 200 immediately)
  → PaymentQueueProcessor handles DB update async
  → on permanent failure: sends alert email to ADMIN_ALERT_EMAIL
```

### Stats cache

The `stats-queue` runs every night at midnight (cron). It computes platform-wide admin stats and stores them as JSON in `SystemSetting` with key `ADMIN_STATS_SNAPSHOT`. Read via `StatsQueueProcessor.getCachedSnapshot(prisma)`.

### Dev/test endpoints

```
POST /api/queue-test/forgot-password   # test email queue with a custom recipient
POST /api/queue-test/send-email        # test generic email queue
GET  /api/queue-test/queue-stats       # view waiting/active/completed/failed counts
```

## API behavior

- Global prefix: `APP_API_PREFIX` (default `api`)
- Global validation pipe: `whitelist: true`, `transform: true`
- Global response interceptor + exception filter enabled
- CORS: `CORS_ORIGIN` env var
- Webhook endpoint (`/wallet/topup/sepay/webhook`) is public (no JWT), secured by `SEPAY_WEBHOOK_API_KEY` header

## Useful docs

- `docs/ARCHITECTURE.md`
- `docs/WORKFLOW.md`
- `docs/PLAN_16_WEEKS.md`
