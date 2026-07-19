# CampusTest Pro Implementation Plan

## Phase 1 - Platform Foundation

- Create an npm workspace monorepo with `apps/web`, `apps/api`, `packages`, and `docs`.
- Build a strict TypeScript Next.js frontend in `apps/web`.
- Build a strict TypeScript NestJS backend in `apps/api`.
- Add PostgreSQL and Redis services through Docker Compose.
- Add `/health` and `/ready` API endpoints.
- Add Swagger API documentation at `/docs`.
- Configure ESLint, Prettier, and TypeScript checks for every workspace.

## Phase 2 - Data Layer

- Add Prisma to the API workspace.
- Define the initial CampusTest Pro database schema.
- Create and apply the initial migration.
- Generate the Prisma client.
- Seed roles, users, courses, assessments, questions, and submissions.
- Verify PostgreSQL and Redis containers locally.

## Phase 3 - Authentication, Roles, and Tenant Security

- Add database-backed authentication with Argon2 password hashes.
- Support `SUPER_ADMIN`, `COLLEGE_ADMIN`, `FACULTY`, and `STUDENT` roles.
- Add college-based tenant isolation foundation through `College` and user `collegeId`.
- Add JWT access tokens and HTTP-only access/refresh cookies.
- Add refresh-token rotation, logout, and token revocation.
- Add `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and `/api/v1/auth/me`.
- Add role-based backend guards and a guarded role verification endpoint.
- Add login rate limiting backed by Redis.
- Add audit logs for login success, login failure, refresh, and logout.
- Add professional `/login`, role dashboards, unauthorized page, session restoration, and logout.
- Hide frontend routes and navigation items outside the current role.
- Add integration tests for login, wrong password, disabled users, protected routes, roles, refresh rotation, logout revocation, and tenant scope.

## Phase 4 - College Management

- Add a full database-backed `College` profile model with unique college code and email.
- Add college status, contact details, address fields, logo URL placeholder, soft delete, created/updated actor tracking, and indexes.
- Add Super Admin-only REST endpoints under `/api/v1/colleges`.
- Add pagination, search, status filtering, and sorting for college lists.
- Add safe archive behavior instead of hard-deleting assessment history.
- Add optional first College Admin creation with Argon2-hashed temporary password.
- Add audit logs for create, update, activation, deactivation, and archive.
- Enforce inactive-college login and token rejection.
- Add Super Admin frontend routes for list, create, detail, and edit.
- Add React Hook Form and Zod validation for college forms.
- Add responsive loading, empty, error, success, and confirmation states.
- Add integration tests for Super Admin access, duplicates, filtering, updates, status, archive, first admin creation, and tenant linkage.

## Phase 5 - Academic Management

- Add department, course, semester, subject, batch, faculty, student, and assignment models in Prisma.
- Add a forward-only Phase 5 migration without resetting the existing database.
- Seed Demo College academic data and connect the existing faculty and student development accounts to real profiles.
- Add REST endpoints for CRUD, search, pagination, sorting, status filters, password resets, activation/deactivation, student import/export/template, assignments, and dashboard counts.
- Automatically create semesters from course duration.
- Enforce server-side college tenant isolation for academic management.
- Add Swagger-decorated DTO validation for academic management routes.
- Add protected frontend routes for academic management with role-aware sidebar entries.
- Add real dashboard statistics for departments, courses, semesters, subjects, faculty, students, and batches.
- Add integration tests for academic CRUD, role rejection, password reset, status toggles, assignment, dashboard stats, and cross-tenant rejection.

## Phase 6 - Question Bank and Assessment Builder

- Add normalized Prisma models for question options, tags, coding-question details, test cases, attachments, import jobs, assessment sections, assessment questions, and assessment assignments.
- Extend legacy assessment and question tables without breaking existing submissions and seeded accounts.
- Support single choice, multiple choice, true/false, fill in the blank, numerical, short answer, descriptive, and coding question records.
- Add secure REST endpoints under `/api/v1/questions` and `/api/v1/assessments`.
- Enforce tenant isolation for Super Admin, College Admin, and Faculty users.
- Enforce faculty subject-assignment authorization for question and assessment creation.
- Add question validation rules, activation blockers, duplicate handling, import job reporting, export filtering, assessment publish blockers, schedule validation, and total-mark calculation.
- Add React Hook Form and Zod-backed question and assessment builder screens.
- Add role-aware navigation for Question Bank and Assessments.
- Seed sample question-bank data and draft/scheduled assessments.
- Add integration tests for question creation, invalid answers, imports, exports, assessment creation, sections, question assignment, duplicate prevention, assignment, scheduling, publishing, cancellation, and tenant scope.

## Phase 7 - Student Exam Engine, Auto-Save, Submission, Evaluation, and Results

- Add normalized Prisma models for test attempts, attempt sections, attempt question snapshots, student answers, answer revisions, attempt events, submission receipts, results, section results, objective evaluations, manual review tasks, and security flags.
- Add server-side eligibility checks for student role, active account, active college, same-college assessment, direct/batch assignment, assessment window, attempt limits, active-attempt conflicts, and valid question snapshots.
- Add idempotent attempt start under `/api/v1/student/assessments/:assessmentId/start` with stable question and option ordering for refresh recovery.
- Add student assessment list/detail, attempt detail, server timer, answer list, single-answer auto-save, batch answer save, event logging, and final submission APIs.
- Add server-controlled timer behavior and expiry protection so answer saves are rejected after submission or expiry.
- Add objective evaluation for single choice, multiple choice, true/false, fill-in-the-blank, and numerical questions with persisted evaluation records.
- Add descriptive/manual review foundations with reviewer routes and result publication/unpublication endpoints.
- Add published student result routes and admin/faculty result routes with tenant isolation.
- Add student frontend routes for test list, instructions, live attempt, submitted receipt, results list, and result detail.
- Add debounced frontend auto-save state, local retry queue, reconnect handling, question palette, marked-for-review state, and server timer resync.
- Add real exam dashboard statistics for students, faculty, and administrators.
- Seed an active assigned assessment, upcoming assessment, completed attempt, published result, objective examples, and a pending manual review task.
- Add integration tests for protected student routes, assigned assessment visibility, stable snapshots, student-safe payloads, answer save, batch save, event logging, submit idempotency, answer rejection after submission, result visibility, review routes, and assessment result routes.
- Document that secure code execution requires a future sandbox, browser anti-cheat signals are review-only, and 5,000-concurrent capacity requires load testing and infrastructure sizing.

## Phase 8 - Exam Operations Hardening, Workers, Review Workflow, Moderation, Analytics, and Readiness

- Add `apps/worker`, a BullMQ/Redis/TypeScript worker application with queue processors, retry/backoff, failed-job records, structured logs, and graceful shutdown.
- Add queues for attempt expiry, auto-submit, result calculation, result publication, notifications, analytics, and cleanup.
- Add database-backed job records, notifications, attempt sessions, moderation history, security reviews, and queue/session metadata.
- Schedule attempt-expiry jobs when attempts start and keep a database sweep as the reliable source of expired-attempt recovery.
- Add idempotent worker/API auto-submit with atomic attempt claiming, submission receipts, objective evaluation, manual review creation, result calculation, audit events, and result-calculation queueing.
- Add operations dashboard APIs and frontend route `/exam-operations`.
- Add review workflow APIs and frontend routes `/reviews`, `/reviews/[reviewId]`, and `/assessments/[assessmentId]/reviews`.
- Add result moderation, publication hardening, CSV export, and frontend routes `/assessments/[assessmentId]/results` and `/assessments/[assessmentId]/moderation`.
- Add security event review APIs and frontend routes `/security-events` and `/attempts/[attemptId]/security`.
- Add secure queue monitoring APIs and frontend route `/system/queues`.
- Add analytics and CSV export foundations with tenant isolation.
- Add k6 load-test scripts under `load-tests/` and document that production capacity remains unverified until real load tests are run.
- Add production-readiness docs for workers, load testing, observability, scaling, and future secure code execution.

## Phase 9 - Production Deployment Hardening, CI/CD, Security, Backups, Observability, Email, and Secure Runner Foundation

- Add production architecture, deployment, environment, database pooling, backup/recovery, CI/CD, email, E2E, security checklist, and incident response documentation.
- Add secure environment validation with development defaults and production fail-fast checks for secrets, CORS, cookies, Swagger, storage, email, worker, and code-runner settings.
- Add optimized production Dockerfiles for web, API, and worker without copying secrets into images.
- Add staging and production-like Docker Compose configurations with internal networking, PostgreSQL, Redis, PgBouncer, migration job, web, API, worker, and Nginx reverse proxy.
- Add PgBouncer configuration and production-safe migration guidance using `DATABASE_URL` for pooled runtime traffic and `DIRECT_DATABASE_URL` for migrations.
- Add guarded backup and restore scripts that require explicit environment values and production confirmation.
- Add GitHub Actions CI plus staging/production deployment workflow foundations using immutable commit SHA image tags.
- Add production security headers, explicit CORS support, secure cookie configuration, Swagger policy, body limits, release/version endpoint, and maintenance-mode foundation.
- Add provider-ready email delivery records with a development console provider.
- Add secure password reset with one-time hashed tokens, expiration, generic request responses, refresh-token invalidation, audit logs, and tests.
- Add worker heartbeat records and system dashboard/API visibility for worker liveness.
- Add private-by-default object-storage signed-upload metadata foundation.
- Add code-runner gateway contract that never executes untrusted code in API/worker and refuses mock mode in production.
- Add Playwright E2E scaffolding and expand k6 load-test profiles for staging preparation.

## Phase 10 - Complete Admin Panel

- Add a protected `/admin` dashboard for `SUPER_ADMIN` and `COLLEGE_ADMIN` users with real tenant-scoped totals for students, faculty, colleges, departments, subjects, exams, questions, results, batches, semesters, and unread notifications.
- Add chart-ready dashboard statistics for assessments, questions, and result publication state.
- Reuse the existing database-backed academic CRUD manager under `/admin/students`, `/admin/faculty`, `/admin/departments`, `/admin/courses`, `/admin/semesters`, `/admin/subjects`, `/admin/batches`, and `/admin/assignments`.
- Add admin APIs under `/api/v1/admin-panel` for dashboard statistics, college settings, profile settings, notifications, audit logs, activity history, and user permission visibility/overrides.
- Add Prisma persistence for user theme preference, college settings, user permission overrides, and activity history.
- Add seeded demo college settings, activity history, notifications, and a development permission override.
- Add dark-mode support through CSS variables and the authenticated shell.
- Preserve backend role guards and tenant isolation so College Admin users remain scoped to their own college.
- Add responsive admin-panel pages with loading, success, empty, pagination, validation, and error states.

## Verification

- Install dependencies.
- Start PostgreSQL and Redis with Docker Compose.
- Run Prisma generate, migration, and seed.
- Run lint, typecheck, tests, and build.
- Verify backend `/health`, `/ready`, and Swagger locally.
- Verify frontend locally.
- For Phase 9, also verify `/api/v1/system/version`, password reset, email development delivery, worker heartbeat, maintenance mode, and production Docker build validation where the local Docker runtime allows it.
- For Phase 10, also verify `/admin`, `/admin/students`, `/admin/faculty`, `/admin/departments`, `/admin/subjects`, `/admin/semesters`, `/admin/batches`, `/admin/college-settings`, `/admin/permissions`, `/admin/profile`, `/admin/notifications`, `/admin/audit-logs`, `/admin/activity`, and the `/api/v1/admin-panel/*` endpoints.
