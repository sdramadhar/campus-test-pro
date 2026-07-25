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

Phase 10 admin panel routes:

- `GET /api/v1/admin-panel/dashboard`
- `GET|PATCH /api/v1/admin-panel/college-settings`
- `GET|PATCH /api/v1/admin-panel/profile`
- `GET /api/v1/admin-panel/notifications`
- `PATCH /api/v1/admin-panel/notifications/:id/read`
- `GET /api/v1/admin-panel/audit-logs`
- `GET /api/v1/admin-panel/activity-history`
- `GET|PATCH /api/v1/admin-panel/permissions`

Frontend routes:

- `/login`
- `/dashboard/super-admin`
- `/dashboard/college-admin`
- `/dashboard/faculty`
- `/dashboard/student`
- `/admin`
- `/admin/students`
- `/admin/faculty`
- `/admin/departments`
- `/admin/courses`
- `/admin/semesters`
- `/admin/subjects`
- `/admin/batches`
- `/admin/assignments`
- `/admin/college-settings`
- `/admin/permissions`
- `/admin/profile`
- `/admin/notifications`
- `/admin/audit-logs`
- `/admin/activity`
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

Phase 10 seed data adds Demo College admin settings, admin-panel notifications, activity-history records, and a development permission override.

Phase 11/12 AI workflow routes:

- `POST /api/v1/ai/questions/generate`
- `POST /api/v1/ai/questions/batch-generate`
- `GET /api/v1/ai/batch-generations/:batchId`
- `POST /api/v1/ai/batch-generations/:batchId/cancel`
- `POST /api/v1/ai/batch-generations/:batchId/retry`
- `POST /api/v1/ai/answers/generate`
- `GET /api/v1/ai/jobs`
- `GET /api/v1/ai/jobs/:jobId`
- `POST /api/v1/ai/jobs/:jobId/cancel`
- `POST /api/v1/ai/jobs/:jobId/regenerate`
- `POST /api/v1/ai/jobs/:jobId/approve`
- `POST /api/v1/ai/jobs/:jobId/reject`
- `POST /api/v1/ai/jobs/:jobId/save-approved`
- `GET /api/v1/ai/jobs/:jobId/results/:resultId/versions`
- `GET|POST|PATCH|DELETE /api/v1/ai/prompts`
- `POST /api/v1/ai/prompts/:id/rollback`
- `GET /api/v1/ai/usage`
- `GET|PATCH /api/v1/ai/settings`
- `POST /api/v1/ai/exam-engine/paper`
- `POST /api/v1/ai/exam-engine/random-sets`
- `GET /api/v1/ai/exam-engine/papers`
- `GET /api/v1/ai/exam-engine/questions/:id/analytics`
- `POST /api/v1/question-imports/documents`
- `GET /api/v1/question-imports/jobs`
- `GET|POST|DELETE /api/v1/question-imports/jobs/:jobId`
- `GET /api/v1/question-imports/jobs/:jobId/validation-report`
- `POST /api/v1/questions/check-duplicate`
- `GET /api/v1/questions/:id/duplicates`
- `PATCH /api/v1/question-duplicates/:id/review`
- `GET|POST|PATCH /api/v1/syllabi`
- `GET /api/v1/syllabi/:id/coverage`

Phase 11/12 frontend routes:

- `/questions/ai-generate`
- `/questions/ai-batch`
- `/questions/ai-jobs`
- `/questions/ai-jobs/[jobId]`
- `/questions/ai-review/[jobId]`
- `/questions/import-document`
- `/questions/import-document/jobs`
- `/questions/import-document/jobs/[jobId]`
- `/admin/ai/prompts`
- `/admin/ai/usage`
- `/admin/ai/settings`
- `/academic/syllabi`
- `/academic/syllabi/[id]/coverage`
- `/assessments/ai-paper`
- `/assessments/random-sets`

AI defaults are development-only. `AI_PROVIDER=mock` creates deterministic sample questions for local testing and is rejected in production. Real provider adapters are available for `openai`, `gemini`, `anthropic`, `azure-openai`, and `ollama`; keys and endpoints are read only from server environment variables. AI output and document-extracted candidates must be reviewed by a human and are saved into the Question Bank as `DRAFT`, never as active questions.

Phase 13 adds an AI examination engine on top of the Phase 11/12 workflow foundation. Faculty and administrators can batch-generate 10-500 review-first questions, track progress, cancel or retry jobs, generate model answers, generate draft exam papers from syllabus/blueprint distributions, create duplicate-free random sets A-D, inspect AI question analytics, roll back prompt versions, and view document-import validation reports. Seed data includes a completed demo AI batch generation and generated paper set for Demo College.

Phase 14 analytics and reporting routes:

- `GET /api/v1/analytics/platform`
- `GET /api/v1/analytics/colleges`
- `GET /api/v1/analytics/college`
- `GET /api/v1/analytics/departments`
- `GET /api/v1/analytics/batches`
- `GET /api/v1/analytics/faculty`
- `GET /api/v1/analytics/student`
- `GET /api/v1/students/:studentId/analytics`
- `GET /api/v1/assessments/:assessmentId/analytics`
- `GET /api/v1/assessments/:assessmentId/leaderboard`
- `GET /api/v1/assessments/:assessmentId/report`
- `GET /api/v1/questions/:questionId/analytics`
- `GET /api/v1/analytics/subjects`
- `GET /api/v1/analytics/topics`
- `GET /api/v1/academic/syllabi/:id/analytics`
- `POST /api/v1/analytics/compare`
- `GET|POST|PATCH|DELETE /api/v1/reports`
- `POST /api/v1/reports/:id/run`
- `POST /api/v1/reports/:id/schedule`
- `GET /api/v1/report-jobs`
- `GET /api/v1/report-jobs/:jobId`
- `POST /api/v1/report-jobs/:jobId/cancel`
- `GET /api/v1/report-files/:fileId/download`
- `GET /api/v1/analytics/insights`
- `POST /api/v1/analytics/insights/generate`
- `PATCH /api/v1/analytics/insights/:id/review`

Phase 14 frontend routes:

- `/super-admin/analytics`
- `/admin/analytics`
- `/admin/reports`
- `/faculty/analytics`
- `/student/analytics`
- `/analytics/subjects`
- `/analytics/topics`
- `/analytics/compare`
- `/leaderboards`
- `/assessments/[assessmentId]/analytics`
- `/assessments/[assessmentId]/leaderboard`
- `/assessments/[assessmentId]/reports`
- `/questions/[questionId]/analytics`
- `/students/[studentId]/report`
- `/student/report`
- `/reports/builder`
- `/reports/saved`
- `/reports/jobs`
- `/analytics/insights`

Phase 14 uses PostgreSQL as the source of truth and Redis only for short-lived, tenant-prefixed aggregate caching. Reports are generated server-side, download attempts are audited, CSV output escapes formula-leading values, leaderboards use published results only, and AI insights are aggregate-only suggestions requiring human review. PDF and XLSX support are implemented as foundations; production-grade rendering/storage should be hardened before external distribution.

Phase 12 AI/OCR environment variables:

- `AI_PROVIDER`, `AI_MODEL`, `AI_TEMPERATURE`, `AI_MAX_OUTPUT_TOKENS`, `AI_EMBEDDING_MODEL`
- `OPENAI_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`
- `OLLAMA_BASE_URL`
- `OCR_PROVIDER=none|tesseract`, `TESSERACT_BINARY_PATH`

Document import accepts TXT, Markdown, CSV, text PDF, DOCX, XLSX, PNG, and JPG payloads. Images and scanned PDFs require Tesseract OCR; when OCR is not configured they are stored as `OCR_REQUIRED` jobs for later processing.

Coding questions store test cases and hidden-case metadata, but CampusTest Pro does not execute untrusted code yet. Browser exam events are review signals only; they do not automatically declare misconduct.

## Phase 16 Secure Coding Judge

Phase 16 adds a secure coding-judge foundation with database-backed programming languages, runner image metadata, coding submissions, executions, per-test results, revisions, evaluations, review tasks, runner jobs/failures, plagiarism jobs, similarity matches, and coding audit events.

Coding routes include:

- `POST /api/v1/student/attempts/:attemptId/coding/:attemptQuestionId/run`
- `POST /api/v1/student/attempts/:attemptId/coding/:attemptQuestionId/submit`
- `GET /api/v1/student/coding-submissions`
- `GET /api/v1/student/coding-submissions/:submissionId`
- `GET /api/v1/coding/jobs/:jobId`
- `POST /api/v1/coding/jobs/:jobId/cancel`
- `GET /api/v1/coding/submissions`
- `GET /api/v1/coding/submissions/:submissionId`
- `POST /api/v1/coding/submissions/:submissionId/rejudge`
- `POST /api/v1/coding/submissions/:submissionId/hold`
- `POST /api/v1/coding/submissions/:submissionId/release`
- `PATCH /api/v1/coding/submissions/:submissionId/score`
- `POST /api/v1/assessments/:assessmentId/coding/rejudge`
- `POST|GET /api/v1/coding/plagiarism/jobs`
- `GET /api/v1/coding/plagiarism/jobs/:jobId`
- `GET /api/v1/coding/plagiarism/matches/:matchId`
- `PATCH /api/v1/coding/plagiarism/matches/:matchId/review`
- `GET /api/v1/analytics/coding`
- `GET /api/v1/assessments/:assessmentId/coding-analytics`
- `GET /api/v1/questions/:questionId/coding-analytics`
- `GET /api/v1/code-runner/health`
- `GET /api/v1/code-runner/languages`
- `GET /api/v1/code-runner/images`

Frontend routes include:

- `/student/coding-submissions`
- `/student/coding-submissions/[submissionId]`
- `/student/attempts/[attemptId]/coding/[attemptQuestionId]`
- `/coding/reviews`
- `/coding/reviews/[submissionId]`
- `/assessments/[assessmentId]/coding-submissions`
- `/coding/plagiarism`
- `/coding/plagiarism/jobs/[jobId]`
- `/coding/plagiarism/matches/[matchId]`
- `/system/code-runner`
- `/admin/code-runner/languages`
- `/admin/code-runner/images`
- `/analytics/coding`
- `/assessments/[assessmentId]/coding-analytics`
- `/questions/[questionId]/coding-analytics`

Local development uses `CODE_RUNNER_MODE=MOCK`; the mock gateway never compiles or executes untrusted code. Production must use a separately hardened isolated runner service. See `docs/CODE_RUNNER_SECURITY.md`, `docs/CODE_RUNNER_OPERATIONS.md`, `docs/CODE_RUNNER_THREAT_MODEL.md`, `docs/CODE_RUNNER_LOCAL_SETUP.md`, `docs/CODING_ASSESSMENTS.md`, and `docs/CODING_PLAGIARISM.md`.

## Phase 17 Enterprise Infrastructure

Phase 17 adds provider-neutral production infrastructure foundations: Kubernetes manifests, PgBouncer config, reverse proxy config, Prometheus/Grafana provisioning, CI/security workflows, staging/production env examples, capacity testing docs, and a protected `/system/infrastructure` dashboard.

Key local validation commands:

- `npm run iac:validate`
- `npm run security:secret-scan`
- `npm run k6:smoke` when k6 is installed and the local API is running

No 5,000-concurrent-user support is claimed until a real staging load test passes and results are recorded in `docs/SCALING_RESULTS_TEMPLATE.md`.

Enterprise docs start with `docs/ENTERPRISE_ARCHITECTURE.md`, `docs/PRODUCTION_TOPOLOGY.md`, `docs/STAGING_TOPOLOGY.md`, `docs/ENVIRONMENT_CONFIGURATION.md`, `docs/DATABASE_PRODUCTION.md`, `docs/REDIS_PRODUCTION.md`, `docs/OBJECT_STORAGE.md`, `docs/MONITORING.md`, `docs/ALERTING_RUNBOOK.md`, `docs/DISASTER_RECOVERY.md`, `docs/RESTORE_RUNBOOK.md`, `docs/CAPACITY_TESTING.md`, `docs/ENTERPRISE_SECURITY_AUDIT.md`, `docs/INCIDENT_RESPONSE_RUNBOOK.md`, and `docs/SECRETS_MANAGEMENT.md`.

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
- Local mock code-runner gateway: http://localhost:4100/health
- Infrastructure dashboard: http://localhost:3000/system/infrastructure

## Phase 15 Secure Exam Monitoring

Phase 15 adds review-based proctoring with policy management, student consent, system checks, event batching, session heartbeats, private evidence metadata, live proctor dashboards, review queues, result hold/release, and evidence retention.

Key routes:

- `/student/proctoring`
- `/proctor/live`
- `/proctor/reviews`
- `/admin/proctoring/settings`
- `/admin/proctoring/policies`
- `/admin/proctoring/retention`

Documentation:

- `docs/PROCTORING.md`
- `docs/PROCTORING_PRIVACY.md`
- `docs/PROCTORING_CONSENT.md`
- `docs/PROCTORING_SECURITY.md`
- `docs/PROCTORING_OPERATIONS.md`
- `docs/EVIDENCE_RETENTION.md`

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
