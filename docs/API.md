# API

Phase 6 endpoints live under `/api/v1`.

Question bank:

- `GET /questions`
- `GET /questions/:id`
- `POST /questions`
- `PATCH /questions/:id`
- `PATCH /questions/:id/status`
- `POST /questions/:id/duplicate`
- `DELETE /questions/:id`
- `POST /questions/import`
- `GET /questions/import/template`
- `GET /questions/import/:jobId`
- `GET /questions/export`

Assessments:

- `GET /assessments`
- `GET /assessments/:id`
- `POST /assessments`
- `PATCH /assessments/:id`
- `DELETE /assessments/:id`
- `POST /assessments/:id/sections`
- `PATCH /assessments/:id/sections/:sectionId`
- `DELETE /assessments/:id/sections/:sectionId`
- `POST /assessments/:id/questions`
- `DELETE /assessments/:id/questions/:questionId`
- `POST /assessments/:id/assignments`
- `DELETE /assessments/:id/assignments/:assignmentId`
- `POST /assessments/:id/preview`
- `POST /assessments/:id/schedule`
- `POST /assessments/:id/publish`
- `POST /assessments/:id/cancel`
- `POST /assessments/:id/duplicate`

Swagger is available at `http://localhost:4000/api/docs`.

## Phase 7 Exam Engine

Student routes:

- `GET /student/assessments`
- `GET /student/assessments/:assessmentId`
- `POST /student/assessments/:assessmentId/start`
- `GET /student/attempts/:attemptId`
- `GET /student/attempts/:attemptId/time`
- `GET /student/attempts/:attemptId/answers`
- `PUT /student/attempts/:attemptId/answers/:attemptQuestionId`
- `POST /student/attempts/:attemptId/answers/batch`
- `POST /student/attempts/:attemptId/events`
- `POST /student/attempts/:attemptId/submit`
- `GET /student/results`
- `GET /student/results/:resultId`

Review and result routes:

- `GET /reviews`
- `GET /reviews/:id`
- `PATCH /reviews/:id`
- `GET /assessments/:assessmentId/results`
- `GET /attempts/:attemptId/result`
- `POST /assessments/:assessmentId/results/publish`
- `POST /assessments/:assessmentId/results/unpublish`
- `GET /exam-dashboard/stats`

Student-facing attempt and result responses are deliberately safe: they use permanent attempt snapshots and do not include correct answers, hidden coding test cases, answer keys, or evaluator-only metadata.

## Phase 8 Operations

- `GET /exam-operations/dashboard`
- `POST /exam-operations/sweep-expired`
- `GET /exam-operations/analytics`
- `GET /review-workflow`
- `POST /review-workflow/:id/complete`
- `POST /result-moderation/:resultId`
- `POST /result-moderation/assessments/:assessmentId/publish-selected`
- `POST /result-moderation/assessments/:assessmentId/publish-eligible`
- `GET /result-moderation/assessments/:assessmentId/export.csv`
- `GET /security-events`
- `GET /security-events/attempts/:attemptId`
- `POST /security-events/attempts/:attemptId/review`
- `GET /system/queues`
- `POST /system/queues/retry`
- `POST /system/queues/remove`
- `POST /system/queues/:queueName/pause`
- `POST /system/queues/:queueName/resume`

# Phase 11 AI Question Workflows

AI generation, document import, duplicate detection, prompt templates, usage, and syllabi are documented in Swagger at `/api/docs`.

Key routes:

- `POST /api/v1/ai/questions/generate`
- `GET /api/v1/ai/jobs`
- `POST /api/v1/ai/jobs/:jobId/approve`
- `POST /api/v1/ai/jobs/:jobId/reject`
- `POST /api/v1/ai/jobs/:jobId/save-approved`
- `POST /api/v1/question-imports/documents`
- `POST /api/v1/questions/check-duplicate`
- `PATCH /api/v1/question-duplicates/:id/review`
- `GET|POST|PATCH /api/v1/syllabi`

AI and imported questions are review-first and save to the existing Question Bank as `DRAFT`.

# Phase 14 Analytics And Reports

Phase 14 adds protected endpoints for platform, college, faculty, student, assessment, question, subject, topic, comparison, leaderboard, report, and AI-insight analytics under `/api/v1/analytics`, `/api/v1/reports`, `/api/v1/report-jobs`, `/api/v1/report-files`, `/api/v1/assessments/:id/analytics`, and `/api/v1/questions/:id/analytics`.

Swagger at `/api/docs` documents the controller methods. See `docs/ANALYTICS.md`, `docs/REPORTS.md`, `docs/LEADERBOARDS.md`, and `docs/AI_INSIGHTS.md` for formulas and security notes.

# Phase 15 Proctoring API

Phase 15 adds protected review-based proctoring endpoints under `/api/v1`.

Student routes:

- `GET /student/assessments/:assessmentId/proctoring-policy`
- `POST /student/assessments/:assessmentId/proctoring-consent`
- `POST /student/assessments/:assessmentId/system-check`
- `POST /student/attempts/:attemptId/proctoring/start`
- `GET /student/attempts/:attemptId/proctoring/session`
- `POST /student/attempts/:attemptId/proctoring/events/batch`
- `POST /student/attempts/:attemptId/proctoring/heartbeat`
- `POST /student/attempts/:attemptId/proctoring/evidence`
- `POST /student/attempts/:attemptId/proctoring/end`

Proctor/admin routes:

- `GET /proctoring/sessions`
- `GET /proctoring/sessions/:sessionId`
- `POST /proctoring/sessions/:sessionId/warn`
- `POST /proctoring/sessions/:sessionId/message`
- `POST /proctoring/sessions/:sessionId/flag`
- `POST /proctoring/sessions/:sessionId/clear`
- `GET /proctoring/reviews`
- `GET /proctoring/reviews/:sessionId`
- `PATCH /proctoring/reviews/:sessionId`
- `POST /proctoring/reviews/:sessionId/hold-result`
- `POST /proctoring/reviews/:sessionId/release-result`
- `GET|POST|PATCH /proctoring/policies`
- `GET /proctoring/evidence/:id`
- `POST /proctoring/evidence/:id/access-link`
- `POST /proctoring/retention/run`

Swagger documents DTO validation, enums, and role-protected operations.

# Phase 16 Coding Judge API

Student coding routes:

- `POST /api/v1/student/attempts/:attemptId/coding/:attemptQuestionId/run`
- `POST /api/v1/student/attempts/:attemptId/coding/:attemptQuestionId/submit`
- `GET /api/v1/student/coding-submissions`
- `GET /api/v1/student/coding-submissions/:submissionId`

Runner and review routes:

- `GET /api/v1/coding/jobs/:jobId`
- `POST /api/v1/coding/jobs/:jobId/cancel`
- `GET /api/v1/coding/submissions`
- `GET /api/v1/coding/submissions/:submissionId`
- `POST /api/v1/coding/submissions/:submissionId/rejudge`
- `POST /api/v1/coding/submissions/:submissionId/hold`
- `POST /api/v1/coding/submissions/:submissionId/release`
- `PATCH /api/v1/coding/submissions/:submissionId/score`
- `POST /api/v1/assessments/:assessmentId/coding/rejudge`

Plagiarism and analytics routes:

- `POST /api/v1/coding/plagiarism/jobs`
- `GET /api/v1/coding/plagiarism/jobs`
- `GET /api/v1/coding/plagiarism/jobs/:jobId`
- `GET /api/v1/coding/plagiarism/matches/:matchId`
- `PATCH /api/v1/coding/plagiarism/matches/:matchId/review`
- `GET /api/v1/analytics/coding`
- `GET /api/v1/assessments/:assessmentId/coding-analytics`
- `GET /api/v1/questions/:questionId/coding-analytics`

Code-runner status routes:

- `GET /api/v1/code-runner/health`
- `GET /api/v1/code-runner/languages`
- `GET /api/v1/code-runner/images`

Student-facing responses redact hidden test inputs and expected outputs. Swagger at `/api/docs` includes DTO validation and role guards.

# Phase 18 SaaS APIs

Commercial SaaS foundation endpoints include:

- `GET /api/v1/billing/plans`
- `GET /api/v1/billing/plans/:id`
- `POST /api/v1/tenants/signup`
- `GET /api/v1/onboarding`
- `POST /api/v1/onboarding/steps`
- `GET /api/v1/billing/subscription`
- `POST /api/v1/billing/subscription/checkout`
- `POST /api/v1/billing/subscription/change`
- `POST /api/v1/billing/subscription/cancel`
- `POST /api/v1/billing/subscription/reactivate`
- `POST /api/v1/billing/portal`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/payments`
- `GET /api/v1/billing/usage`
- `POST /api/v1/billing/webhooks/:provider`
- `GET|PATCH /api/v1/tenant/branding`
- `GET|POST /api/v1/tenant/domains`
- `GET|POST /api/v1/tenant/data-exports`
- `GET|POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets/:id`
- `POST /api/v1/support/tickets/:id/messages`
- `POST|DELETE /api/v1/mobile/devices`
- `POST|DELETE /api/v1/mobile/push-tokens`
- `GET /api/v1/mobile/config`
- `GET /api/v1/platform/saas`
- `GET /api/v1/platform/tenants`
- `GET /api/v1/platform/tenants/:id`
- `PATCH /api/v1/platform/tenants/:id/status`
- `PATCH /api/v1/platform/tenants/:id/plan`
- `POST /api/v1/platform/tenants/:id/trial-extension`
- `POST /api/v1/platform/tenants/:id/credits`

Swagger documents these routes at `/api/docs` when Swagger is enabled.

# Phase 19 System Release APIs

Protected Super Admin endpoints:

- `GET /api/v1/system/release-readiness` returns release decision, provider/configuration checks, production blockers, version data, and unresolved blocker names.
- `GET /api/v1/system/jobs` returns background job group counts, code-runner job group counts, stale worker heartbeats, and recovery policy metadata.

Public/system endpoints retained:

- `GET /api/v1/system/version`
- `GET /api/v1/system/metrics`
