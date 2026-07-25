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
