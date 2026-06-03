# WorkLink — Backend (`sepbe_G31`)

[![CI](https://github.com/minhtt22-26/sepbe_G31/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtt22-26/sepbe_G31/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/minhtt22-26/sepbe_G31/graph/badge.svg)](https://codecov.io/gh/minhtt22-26/sepbe_G31)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+pgvector-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)

Backend service for **WorkLink** — an AI-powered job matching platform for the Vietnamese labor market.

> Built as the Software Engineering Project (SEP) — Group 31.

---

## AI Matching Pipeline

The core feature is a two-stage AI matching engine using **Gemini Embeddings + pgvector** to rank jobs and candidates by semantic relevance — not keyword search.

```
┌──────────────────────────────────────────────────────────────────┐
│                      INDEXING  (async / Bull queue)              │
│                                                                  │
│  Job Description (rich text)                                     │
│       │                                                          │
│       ▼                                                          │
│  Gemini LLM (gemini-2.5-flash-lite)                              │
│  ──► extract { requirements, benefits } sections                 │
│       │                         │                                │
│       ▼                         ▼                                │
│  Gemini Embedding           Gemini Embedding                     │
│  (gemini-embedding-001)     (gemini-embedding-001)               │
│  reqEmbedding[768]          benefitEmbedding[768]                │
│       └───────────┬──────────────┘                               │
│                   ▼                                              │
│          PostgreSQL + pgvector extension                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      MATCHING  (real-time API)                   │
│                                                                  │
│  Worker Profile ──► Gemini Embedding ──► skillEmbedding[768]     │
│                                                                  │
│  pgvector cosine similarity query:                               │
│    1 - (job.reqEmbedding <=> workerSkill)  →  skillScore         │
│    1 - (job.benefitEmbedding <=> workerCulture) → benefitScore   │
│                                                                  │
│  ScoringService re-ranks by 7 weighted criteria:                 │
│    skill(AI) · benefit(AI) · salary · location · shift ·         │
│    gender · age                                                   │
│                                                                  │
│  Weights are admin-configurable (must sum to 1.0).               │
│  Results filtered by MIN_SCORE_THRESHOLD.                        │
└──────────────────────────────────────────────────────────────────┘
```

**Why pgvector instead of keyword search**: A candidate who wrote "phát triển REST API với Node.js" semantically matches a job requiring "backend web development" — without a single shared keyword. Traditional filter-based job boards miss this entirely.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 + **pgvector** extension (Supabase) |
| Vector Search | pgvector cosine similarity (`<=>` operator) |
| AI — Embeddings | Google Gemini `gemini-embedding-001` (768-dim vectors) |
| AI — LLM | Google Gemini `gemini-2.5-flash-lite` (JD section extraction) |
| Queue | Bull + Redis (async email, payment, stats jobs) |
| Real-time | Socket.io (chat + live notifications) |
| Auth | JWT access/refresh tokens + Google OAuth2 (Passport) |
| File upload | Cloudinary |
| Email | Nodemailer via Gmail SMTP |
| Payment | SePay (bank transfer QR) |
| Scheduler | `@nestjs/schedule` (cron: nightly stats, interview reminders) |
| API docs | Swagger OpenAPI — available at `/api/docs` |
| Deploy | Railway |

---

## Modules

### Feature modules (`src/modules/`)

| Module | Description |
|---|---|
| `auth` | JWT login, refresh, Google OAuth, forgot/reset password |
| `users` | Worker & employer profile management |
| `session` | User session tracking |
| `company` | Company profile & update-request workflow |
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

### Infrastructure (`src/infrastructure/`)

| Module | Description |
|---|---|
| `queue/email` | Transactional email queue — 3× exponential backoff |
| `queue/payment` | SePay webhook queue — returns 200 immediately, processes async |
| `queue/stats` | Nightly stats pre-compute → cached in `SystemSetting` |
| `cloudinary` | File upload service |
| `redis` | Redis client setup |

---

## Project Structure

```
src/
  common/            # guards, filters, interceptors, decorators, helpers
  config/            # typed env configs with validation (Joi)
  infrastructure/    # email, queue (email/payment/stats), cloudinary, redis
  modules/           # feature modules
  generated/prisma/  # Prisma client — auto-generated, do not edit
  prisma.service.ts
  main.ts
prisma/
  schema.prisma      # pgvector extension declared here
  migrations/
```

---

## Quick Start — Local Development

> `.env` đã có sẵn credentials. Chỉ cần install và chạy.

```bash
npm install
npm run start:dev
```

- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`

DB dùng **Supabase** (cloud), Redis dùng **Railway** (cloud) — không cần Docker local.

---

## Docker

### Dev (hot reload)

Mount source code, tự reload khi sửa file:

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f backend
```

### Production-like

```bash
docker compose up --build
```

| Service | Container | Port |
|---|---|---|
| PostgreSQL 16 + pgvector | `sep-db` | `5432` |
| Redis 7 | `sep-redis` | `6379` |
| NestJS | `sep-backend` | `4000` |

```bash
docker compose down      # stop (giữ volume)
docker compose down -v   # stop + xóa DB data
```

---

## Available Scripts

```bash
npm run start:dev     # development with hot reload
npm run build         # compile TypeScript
npm run start:prod    # run compiled build
npm run lint          # ESLint
npm run test          # unit tests
npm run test:cov      # unit tests + coverage report
npm run test:e2e      # end-to-end tests
```

---

## Queue System

| Queue | Purpose | Retry strategy |
|---|---|---|
| `email-queue` | Transactional emails (forgot password, interview reminders) | 3× exponential backoff |
| `payment-queue` | SePay webhook — returns 200 immediately, processes DB update async | 5× exponential backoff + DLQ alert email |
| `stats-queue` | Nightly admin stats pre-compute (cron `0 0 * * *`) | 3× exponential backoff |

---

## Useful Docs

- `docs/ARCHITECTURE.md`
- `docs/WORKFLOW.md`
- `docs/PLAN_16_WEEKS.md`
