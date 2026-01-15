# Team workflow

## Branching

- `main`: stable.
- `dev`: integration.
- `feature/<ticket>-<short>`: feature branches.

## Pull requests

- Small PRs (≤ ~400 lines) when possible.
- Must include: description, test steps, screenshots only if API contract changes.
- Review checklist: typing, error handling, naming, Prisma query safety.

## Definition of Done

- Lint passes: `npm run lint`
- Build passes: `npm run build`
- Prisma migration included when schema changes.
- Updated docs if API/config changed.

## Local commands

- `npm run start:dev`
- `npm run prisma:migrate:dev`
- `npm run prisma:seed`
