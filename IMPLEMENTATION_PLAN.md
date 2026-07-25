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

## Phase 11 - AI Question Workflows

- Add provider-agnostic AI abstractions for mock, OpenAI, Gemini, Anthropic, and future providers, with server-only keys, feature flags, timeout/retry handling, normalized errors, and production mock rejection.
- Add Prisma persistence for AI generation jobs, requests, results, review decisions, usage, prompt templates, provider failures, document imports, chunks, extracted candidates, duplicate candidates, syllabi, syllabus topics, and assessment blueprints.
- Add review-first APIs under `/api/v1/ai`, `/api/v1/question-imports`, `/api/v1/questions/check-duplicate`, `/api/v1/question-duplicates`, `/api/v1/syllabi`, and `/api/v1/assessment-blueprints`.
- Require generated and imported questions to remain pending review until approved, and save approved questions into the existing Question Bank as `DRAFT`.
- Add duplicate detection using normalized text and token similarity, with human reviewer override options.
- Add Bloom taxonomy and difficulty suggestions with separate approved values stored in AI/import metadata.
- Add safe document import foundations for TXT, CSV, XLSX, DOCX, and text PDFs; scanned PDFs/images are marked OCR-required unless a provider is configured.
- Add AI prompt management, usage/settings visibility, quota checks, syllabus coverage, and blueprint foundations.
- Add protected frontend routes for AI generation, jobs, review, document import, admin AI prompts/usage/settings, and syllabi.
- Add integration tests for mock generation, student rejection, review gate, DRAFT save, document import, duplicates, syllabus coverage, and AI usage/settings.

## Phase 12 - AI Provider and OCR Integration

- Replace external AI placeholders with real server-side adapters for OpenAI, Google Gemini, Anthropic Claude, Azure OpenAI, and local Ollama.
- Keep provider/model switching configuration-driven through `AI_PROVIDER`, `AI_MODEL`, provider-specific API key variables, Azure deployment variables, and Ollama base URL.
- Add prompt runtime settings for temperature, max output tokens, model override, provider compatibility, prompt versions, and review history.
- Add Tesseract OCR integration behind an OCR abstraction, with images and scanned PDFs marked `OCR_REQUIRED` when OCR is disabled or unavailable.
- Expand document import support for PDF, DOCX, XLSX, TXT, Markdown, CSV, PNG, and JPG inputs through parser/OCR metadata.
- Add structured question detection for MCQ, true/false, fill-in-the-blank, coding, short-answer, and descriptive candidates.
- Add automatic advisory classification for Bloom taxonomy, difficulty, marks, topic, chapter, and source metadata.
- Add embedding-backed duplicate detection with semantic score, fuzzy score, provider/model metadata, and local deterministic fallback for dev/test.
- Add AI generated-result version records and an API endpoint for human-review comparison after edits.
- Store embeddings for approved AI/imported questions saved into the Question Bank as `DRAFT`.
- Expand AI usage/settings dashboard data with provider status, token totals, cost totals, failed jobs, provider failures, and generation statistics.
- Add integration tests for runtime prompt settings, result versions, semantic duplicate metadata, document classification, OCR-required image imports, and admin AI usage/settings.

## Phase 13 - AI Examination Engine

- Add production-ready AI question-generation workflows for MCQ, true/false, fill-in-the-blank, descriptive, coding, and numerical question types.
- Add generation options for subject, department, semester, topic, Bloom level, difficulty, marks, requested count, language, and output format.
- Support AI batch generation for 10-500 questions with progress tracking, cancellation, retry, usage logging, and review-pending notifications.
- Add AI exam-paper generation from subject, syllabus/blueprint metadata, chapter weightage, Bloom distribution, difficulty distribution, marks distribution, duration, and total marks.
- Add random paper-set generation for Set A, Set B, Set C, and Set D while avoiding duplicate questions across generated sets.
- Add model-answer generation for objective, descriptive, coding, and numerical questions, including coding starter-code/test metadata.
- Add question analytics for AI confidence, duplicate score, estimated difficulty, solving time, Bloom classification, and topic prediction.
- Add document-import validation reports with syllabus mapping, chapter mapping, duplicate preview, validation issues, warnings, and import history.
- Add prompt rollback support for versioned AI prompt templates.
- Add Phase 13 frontend routes for AI batch generation, AI paper generation, and random paper sets.
- Add notifications for AI generation completion/failure, import completion, and pending review.
- Seed a completed demo AI batch generation and a generated AI paper set for Demo College.
- Add integration tests for batch generation, retry/progress, paper generation, random sets, answer generation, analytics, validation report, and prompt rollback.

## Phase 14 - Advanced Analytics, Reporting, Dashboards, Exports, Leaderboards, AI Insights, and Performance Intelligence

- Add a dedicated `AnalyticsModule` with tenant-scoped service helpers, reusable date-range validation, Redis-backed cacheable summaries, server-side aggregation queries, report generation, report download audit, and Swagger-documented controllers.
- Add Prisma persistence for analytics snapshots, aggregation jobs, report definitions, report jobs, report files, report schedules, saved dashboards, saved filters, analytics insights, performance snapshots, leaderboard snapshots, benchmark snapshots, and export audits.
- Add Super Admin, College Admin, Faculty, Student, assessment, question, subject, topic, syllabus, comparison, leaderboard, report, and insight analytics APIs under `/api/v1`.
- Add role-aware frontend routes for platform analytics, admin analytics/reports, faculty analytics, student analytics/report cards, subject/topic analytics, comparison, assessment analytics/reports/leaderboards, question analytics, saved reports, report jobs, report builder, leaderboards, and AI insights.
- Add real score aggregation for participation, completion, average, median, pass percentage, score distribution, section summary, question accuracy, measured difficulty, low-sample warnings, topic coverage, and published-only leaderboard ranking.
- Add CSV report generation with formula-injection protection, expiring report metadata, download auditing, and seeded report/job/file/schedule examples.
- Add cautious AI insight foundations using aggregate-only payloads, human-review status, useful/dismissed review actions, and disabled-by-default predictive analytics warnings.
- Seed analytics snapshots, report definitions, report jobs/files/schedules, leaderboard snapshots, insights, performance snapshots, benchmarks, and export audit data for Demo College.
- Add integration tests for platform authorization, tenant-scoped college analytics, faculty/student analytics, assessment analytics, question analytics, subject/topic analytics, comparisons, leaderboard ranking, report generation/download audit, and insight review.
- Add analytics, reports, leaderboards, AI insights, performance, privacy, and report-security documentation.

## Phase 15 - Secure Exam Monitoring, Review-Based Proctoring, Session Control, Evidence Management, Privacy, and Exam Security Operations

- Add a dedicated `ProctoringModule` with student policy/consent/system-check/session APIs, proctor live-session APIs, review queue APIs, policy management, evidence access, retention jobs, and Swagger DTOs.
- Add Prisma persistence for proctoring policies, sessions, events, warnings, evidence, evidence access audits, identity/environment checks, device sessions, heartbeats, reviews, decisions, overrides, retention jobs, live proctor assignments, and proctor notes.
- Add review-based risk scoring for fullscreen exits, tab/window changes, copy/paste/context-menu events, network disconnects, second-session attempts, identity failures, and manual flags.
- Keep automated signals advisory; final outcomes require human review and can hold/release results without exposing raw evidence storage keys.
- Add tenant isolation and student ownership checks across proctoring sessions, reviews, policies, and evidence.
- Add frontend routes for student consent/system check/session visibility, live proctor dashboards, proctor review queues, admin policy/settings pages, evidence retention, and assessment-level monitoring.
- Seed Demo College proctoring policies, a flagged metadata-only session, events, warning, evidence metadata, identity/environment checks, heartbeat, review decision, retention job, and live proctor assignment.
- Add integration tests for consent, system check, event batching/idempotency, heartbeat, evidence privacy, role rejection, proctor warning/flag, review decision, evidence access audit, and retention.
- Add proctoring, privacy, consent, security, operations, and evidence-retention documentation.

## Phase 16 - Secure Coding Judge Foundation

- Add database-backed programming-language, runner-image, coding-submission, execution, execution-test-result, revision, evaluation, review-task, runner-job, runner-failure, plagiarism-job, similarity-match, and coding-audit models.
- Extend coding-question and test-case metadata with language allowlists, starter code per language, resource limits, checker type, partial-scoring policy, per-test weights, and hidden/public visibility.
- Add a protected Coding API for student run/submit/history/detail, faculty/admin review/rejudge/hold/release/score override, runner job status/cancel, plagiarism jobs/matches, and coding analytics.
- Add a safe code-runner gateway workspace and shared runner contract/language-registry packages.
- Keep local runner execution mock-only and block mock mode in production. The API/worker do not execute untrusted code.
- Add frontend routes for student coding submissions, attempt editor, coding reviews, plagiarism review, runner health/languages/images, and coding analytics.
- Seed Demo College coding-language, runner-image, accepted/wrong-answer submission, execution, evaluation, review, plagiarism, and audit examples.
- Add integration tests for language validation, source limits, public run, final submit, hidden-test redaction, review actions, rejudge, score override, plagiarism workflow, and analytics.
- Add code-runner security, operations, threat-model, local-setup, coding-assessment, and plagiarism documentation.

## Phase 17 - Enterprise Infrastructure and Capacity Validation

- Add provider-neutral target architecture, production topology, and staging topology documentation with Mermaid diagrams.
- Add staging/production environment validation aliases and example files for app identity, URLs, pooled/direct database URLs, Redis, object storage, internal tokens, observability, feature flags, and code-runner configuration.
- Harden production Dockerfiles with deterministic installs, non-root runtime users, health checks, immutable labels, and no secret-copy behavior.
- Add Kubernetes manifests for namespace, service account, config map, secret references, deployments, services, ingress, HPAs, PDBs, NetworkPolicies, migration job, backup CronJob, report cleanup CronJob, and evidence-retention CronJob.
- Add PgBouncer, reverse proxy, Prometheus, Grafana, alert, and enterprise-local compose foundations.
- Add protected system infrastructure, capacity, deployment-safety, backups, alerts, maintenance enable/disable, and metrics-summary APIs plus `/system/infrastructure`.
- Add CI hardening foundations for IaC validation, secret scan, CodeQL, Dependabot, container scan, and code-runner gateway image build.
- Expand k6 load-test profiles and document capacity testing without claiming 5,000 concurrent support until staging results pass.
- Add enterprise docs for database/Redis/object storage/CDN/TLS/secrets/monitoring/logging/alerting/backups/DR/restore/security audit/incident response/performance/read replicas/WAF/zero-downtime deployment.

## Phase 18 - Commercial SaaS Foundation

- Add tenant lifecycle statuses for lead, trial, active, past-due, suspended, cancelled, and archived institutions.
- Add tenant onboarding progress, setup checklist, institution signup, trial creation, and save/resume onboarding foundations.
- Add subscription plans, plan versions, features, limits, tenant subscriptions, subscription history, billing customer, invoice, payment, checkout, webhook, credit, coupon, usage meter, entitlement, add-on, tax, and billing audit models.
- Add disabled/mock billing provider abstraction plus production validation that rejects mock billing and requires server-side provider secrets for paid providers.
- Add billing, subscription, usage, branding, custom-domain, support, announcement, mobile device, push-token, data export, legal, and platform tenant APIs with Swagger coverage.
- Add route foundations for pricing, signup, onboarding, subscription settings, billing, support, super-admin SaaS operations, announcements, status, PWA offline shell, and mobile foundation documentation.
- Add white-label branding validation, custom-domain DNS verification foundation, tenant export/cancellation foundations, legal document versioning, support ticket operations, mobile API conventions, and PWA safe-cache policy.
- Seed four plans, features, limits, mock customer/invoice/payment data, active subscription, coupon, usage records, branding, pending domain, support ticket, announcement, and legal document versions.
- Document that mock billing never charges money, custom domains require DNS/TLS, legal templates require professional review, PWA does not support offline high-stakes exams, mobile app is a foundation, and production launch still requires real deployment and load validation.

## Verification

- Install dependencies.
- Start PostgreSQL and Redis with Docker Compose.
- Run Prisma generate, migration, and seed.
- Run lint, typecheck, tests, and build.
- Verify backend `/health`, `/ready`, and Swagger locally.
- Verify frontend locally.
- For Phase 9, also verify `/api/v1/system/version`, password reset, email development delivery, worker heartbeat, maintenance mode, and production Docker build validation where the local Docker runtime allows it.
- For Phase 10, also verify `/admin`, `/admin/students`, `/admin/faculty`, `/admin/departments`, `/admin/subjects`, `/admin/semesters`, `/admin/batches`, `/admin/college-settings`, `/admin/permissions`, `/admin/profile`, `/admin/notifications`, `/admin/audit-logs`, `/admin/activity`, and the `/api/v1/admin-panel/*` endpoints.
- For Phase 11, also verify `/questions/ai-generate`, `/questions/ai-jobs`, `/questions/import-document`, `/admin/ai/prompts`, `/admin/ai/usage`, `/academic/syllabi`, Swagger, and the mock-provider review workflow.
- For Phase 16, also verify `/student/coding-submissions`, `/coding/reviews`, `/coding/plagiarism`, `/system/code-runner`, `/admin/code-runner/languages`, `/analytics/coding`, API health/readiness/Swagger, and `http://localhost:4100/health` for the local mock gateway.
- For Phase 17, also verify `/system/infrastructure`, `/api/v1/system/infrastructure`, `/api/v1/system/capacity`, `/api/v1/system/deployment-safety`, `/api/v1/system/backups`, `/api/v1/system/alerts`, `/api/v1/system/metrics-summary`, `/api/v1/system/metrics`, Kubernetes manifest validation, monitoring config, secret scan, and k6 smoke script syntax where tooling is available.
- For Phase 18, also verify `/pricing`, `/signup/institution`, `/onboarding`, `/settings/subscription`, `/settings/branding`, `/settings/domains`, `/support`, `/super-admin/saas`, `/super-admin/tenants`, `/status`, billing/subscription APIs, webhook idempotency, entitlement blocks, support isolation, mobile device/push-token ownership, data export audit, legal documents, PWA manifest/service worker, and Swagger.
- For Phase 12, also verify external provider configuration stays server-side, mock remains dev/test only, OCR defaults to disabled, image imports become OCR-required without Tesseract, edited AI results create version history, duplicate checks include semantic/fuzzy metadata, and approved questions remain `DRAFT`.
- For Phase 13, also verify `/questions/ai-batch`, `/assessments/ai-paper`, `/assessments/random-sets`, batch progress/cancel/retry APIs, generated paper-set APIs, model-answer APIs, prompt rollback, validation reports, question analytics, notifications, Swagger, and worker/API readiness.
- For Phase 14, also verify `/super-admin/analytics`, `/admin/analytics`, `/faculty/analytics`, `/student/analytics`, `/analytics/compare`, `/leaderboards`, `/reports/builder`, `/reports/jobs`, `/analytics/insights`, analytics/report APIs, report download audit, leaderboard policy, AI insight review, and the predictive analytics limitations notice.
- For Phase 15, also verify `/student/proctoring`, `/proctor/live`, `/proctor/reviews`, `/admin/proctoring/settings`, `/admin/proctoring/policies`, `/admin/proctoring/retention`, `/assessments/:id/proctoring`, `/assessments/:id/proctoring-reviews`, proctoring policy/session/review/evidence APIs, evidence access audit, retention job execution, Swagger, and the privacy/consent docs.
