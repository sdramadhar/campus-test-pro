# Code Runner Local Setup

Phase 16 can be verified locally without running untrusted code.

## Start Infrastructure

```powershell
docker compose up -d postgres redis
```

## Run Database Tasks

```powershell
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

## Start Services

Use mock mode for local development:

```powershell
$env:CODE_RUNNER_MODE = "MOCK"
npm run dev --workspace apps/api
npm run dev --workspace apps/web
npm run dev --workspace apps/worker
npm run dev --workspace apps/code-runner-gateway
```

## Verify

- `http://localhost:4000/health`
- `http://localhost:4000/ready`
- `http://localhost:4000/api/docs`
- `http://localhost:4100/health`
- `http://localhost:3000/student/coding-submissions`
- `http://localhost:3000/coding/reviews`
- `http://localhost:3000/coding/plagiarism`
- `http://localhost:3000/system/code-runner`
- `http://localhost:3000/admin/code-runner/languages`
- `http://localhost:3000/analytics/coding`

The mock runner returns deterministic sanitized results and stores execution records for review workflows.
