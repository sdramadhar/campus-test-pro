# CampusTest Pro

CampusTest Pro is a monorepo for a college assessment platform with a Next.js frontend, NestJS API, PostgreSQL, Redis, and Prisma.

## Structure

- `apps/web` - Next.js TypeScript frontend
- `apps/api` - NestJS TypeScript backend
- `apps/worker` - BullMQ TypeScript background worker
- `packages` - shared packages
- `docs` - project documentation

## Getting Started

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Start infrastructure with `docker compose up -d postgres redis`.
4. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
5. Run `npm run dev`.

## Authentication

The API uses database-backed authentication with Argon2 password hashing, JWT access tokens, rotating refresh tokens, HTTP-only cookies, Redis-backed login rate limiting, backend role guards, disabled-account checks, and audit logging.

Auth routes:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

College routes are restricted to `SUPER_ADMIN`:

- `GET /api/v1/colleges`
- `GET /api/v1/colleges/:id`
- `POST /api/v1/colleges`
- `PATCH /api/v1/colleges/:id`
- `PATCH /api/v1/colleges/:id/status`
- `DELETE /api/v1/colleges/:id`

Academic management routes are restricted to `SUPER_ADMIN` and `COLLEGE_ADMIN` with backend tenant isolation:

- `GET|POST /api/v1/departments`
- `GET|PATCH|DELETE /api/v1/departments/:id`
- `GET|POST /api/v1/courses`
- `GET|PATCH|DELETE /api/v1/courses/:id`
- `GET /api/v1/semesters`
- `PATCH /api/v1/semesters/:id`
- `GET|POST|PATCH|DELETE /api/v1/subjects`
- `GET|POST|PATCH|DELETE /api/v1/batches`
- `GET|POST|PATCH /api/v1/faculty`
- `PATCH /api/v1/faculty/:id/status`
- `POST /api/v1/faculty/:id/reset-password`
- `GET|POST|PATCH /api/v1/students`
- `GET /api/v1/students/template`
- `GET /api/v1/students/export`
- `POST /api/v1/students/import`
- `POST|PATCH /api/v1/students/bulk`
- `PATCH /api/v1/students/:id/status`
- `POST /api/v1/students/:id/reset-password`
- `GET|POST|DELETE /api/v1/assignments`
- `GET /api/v1/academic/stats`

Question bank and assessment-builder routes are restricted to `SUPER_ADMIN`, `COLLEGE_ADMIN`, and permitted `FACULTY` users:

- `GET|POST /api/v1/questions`
- `GET|PATCH|DELETE /api/v1/questions/:id`
- `PATCH /api/v1/questions/:id/status`
- `POST /api/v1/questions/:id/duplicate`
- `POST /api/v1/questions/import`
- `GET /api/v1/questions/import/template`
- `GET /api/v1/questions/import/:jobId`
- `GET /api/v1/questions/export`
- `GET|POST /api/v1/assessments`
- `GET|PATCH|DELETE /api/v1/assessments/:id`
- `POST|PATCH|DELETE /api/v1/assessments/:id/sections`
- `POST|DELETE /api/v1/assessments/:id/questions`
- `POST|DELETE /api/v1/assessments/:id/assignments`
- `POST /api/v1/assessments/:id/preview`
- `POST /api/v1/assessments/:id/schedule`
- `POST /api/v1/assessments/:id/publish`
- `POST /api/v1/assessments/:id/cancel`
- `POST /api/v1/assessments/:id/duplicate`

Student exam engine routes are database-backed and restricted by role, ownership, assessment assignment, and college tenant:

- `GET /api/v1/student/assessments`
- `GET /api/v1/student/assessments/:assessmentId`
- `POST /api/v1/student/assessments/:assessmentId/start`
- `GET /api/v1/student/attempts/:attemptId`
- `GET /api/v1/student/attempts/:attemptId/time`
- `GET /api/v1/student/attempts/:attemptId/answers`
- `PUT /api/v1/student/attempts/:attemptId/answers/:attemptQuestionId`
- `POST /api/v1/student/attempts/:attemptId/answers/batch`
- `POST /api/v1/student/attempts/:attemptId/events`
- `POST /api/v1/student/attempts/:attemptId/submit`
- `GET /api/v1/student/results`
- `GET /api/v1/student/results/:resultId`

Review and result routes:

- `GET|PATCH /api/v1/reviews`
- `GET /api/v1/reviews/:id`
- `GET /api/v1/assessments/:assessmentId/results`
- `POST /api/v1/assessments/:assessmentId/results/publish`
- `POST /api/v1/assessments/:assessmentId/results/unpublish`
- `GET /api/v1/attempts/:attemptId/result`
- `GET /api/v1/exam-dashboard/stats`

Phase 8 exam operations routes:

- `GET /api/v1/exam-operations/dashboard`
- `POST /api/v1/exam-operations/sweep-expired`
- `GET /api/v1/exam-operations/analytics`
- `GET /api/v1/review-workflow`
- `POST /api/v1/review-workflow/:id/complete`
- `POST /api/v1/result-moderation/:resultId`
- `POST /api/v1/result-moderation/assessments/:assessmentId/publish-selected`
- `POST /api/v1/result-moderation/assessments/:assessmentId/publish-eligible`
- `GET /api/v1/result-moderation/assessments/:assessmentId/export.csv`
- `GET /api/v1/security-events`
- `GET /api/v1/security-events/attempts/:attemptId`
- `POST /api/v1/security-events/attempts/:attemptId/review`
- `GET /api/v1/system/queues`

Frontend routes:

- `/login`
- `/dashboard/super-admin`
- `/dashboard/college-admin`
- `/dashboard/faculty`
- `/dashboard/student`
- `/super-admin/colleges`
- `/super-admin/colleges/new`
- `/super-admin/colleges/[id]`
- `/super-admin/colleges/[id]/edit`
- `/academic/departments`
- `/academic/courses`
- `/academic/semesters`
- `/academic/subjects`
- `/academic/batches`
- `/academic/faculty`
- `/academic/students`
- `/academic/assignments`
- `/questions`
- `/questions/new`
- `/questions/[id]`
- `/questions/[id]/edit`
- `/questions/import`
- `/assessments`
- `/assessments/new`
- `/assessments/[id]`
- `/assessments/[id]/edit`
- `/assessments/[id]/preview`
- `/assessments/[id]/assign`
- `/student/tests`
- `/student/tests/[assessmentId]/instructions`
- `/student/attempts/[attemptId]`
- `/student/attempts/[attemptId]/submitted`
- `/student/results`
- `/student/results/[resultId]`
- `/reviews`
- `/reviews/[reviewId]`
- `/assessments/[assessmentId]/reviews`
- `/assessments/[assessmentId]/results`
- `/assessments/[assessmentId]/moderation`
- `/security-events`
- `/attempts/[attemptId]/security`
- `/exam-operations`
- `/system/queues`
- `/unauthorized`

## Development Accounts

These credentials are for local development only.

| Role          | Email                         | Password        |
| ------------- | ----------------------------- | --------------- |
| SUPER_ADMIN   | `superadmin@campustest.local` | `Admin@12345`   |
| COLLEGE_ADMIN | `admin@demo-college.local`    | `Admin@12345`   |
| FACULTY       | `faculty@demo-college.local`  | `Faculty@12345` |
| STUDENT       | `student@demo-college.local`  | `Student@12345` |

Students can also log in with student ID `STU-1001`.

The seed also creates development-only academic data for Demo College: a CSE department, BTECH-CSE course, 8 semesters, one subject, one 2026 section A batch, faculty and student profiles, and a subject assignment.

Phase 6 seed data adds tags, single-choice, multiple-choice, true/false, numerical, descriptive, fill-in-the-blank, and coding questions, plus draft and scheduled assessments. Phase 7 seed data adds an active student-assigned exam, an upcoming exam, a completed attempt, a published result, and a pending descriptive manual review task.

Phase 8 seed data adds an expired attempt for auto-submit recovery, job records, a notification, a security review signal, and moderation history.

Coding questions store test cases and hidden-case metadata, but CampusTest Pro does not execute untrusted code yet. Browser exam events are review signals only; they do not automatically declare misconduct.

## Verification Commands

- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Worker:

- `npm run dev --workspace apps/worker`
- `npm run build --workspace apps/worker`

## Local URLs

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- API readiness: http://localhost:4000/ready
- Swagger: http://localhost:4000/api/docs

## Phase 9 Production Readiness

Phase 9 adds production deployment hardening while preserving local Docker development support.

New production assets:

- `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.worker`
- `docker-compose.staging.yml`
- `docker-compose.production.yml`
- `infra/nginx/campustest.conf`
- `config/pgbouncer.ini`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`
- `scripts/backup-postgres.ps1`
- `scripts/restore-postgres.ps1`

New Phase 9 routes:

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/system/version`
- `GET /api/v1/system/workers`
- `GET|POST /api/v1/system/maintenance`
- `POST /api/v1/storage/signed-upload`
- `POST /api/v1/code-runner/jobs`
- `/forgot-password`
- `/reset-password`
- `/maintenance`

Production documentation:

- `docs/PRODUCTION_ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENTS.md`
- `docs/DATABASE_POOLING.md`
- `docs/BACKUP_RECOVERY.md`
- `docs/EMAIL.md`
- `docs/CI_CD.md`
- `docs/E2E_TESTING.md`
- `docs/SECURITY_CHECKLIST.md`
- `docs/INCIDENT_RESPONSE.md`

Additional commands:

- `npm run format:check`
- `npm run db:migrate:status`
- `npm run docker:build`
- `npm run e2e`

`npm run e2e` requires Playwright browsers and the local API/web stack to be running.

Limitations:

- No production deployment has been performed from this workstation.
- High-concurrency capacity must be proven in staging with k6 and production-like infrastructure.
- External email, object storage, error tracking, and code execution require real provider credentials.
- The code-runner interface does not execute untrusted code inside the API or worker.
