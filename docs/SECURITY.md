# Security

- Authentication uses Argon2 hashes, JWT access tokens, rotating refresh tokens, HTTP-only cookies, and Redis-backed login rate limiting.
- Question-bank and assessment-builder routes require backend guards; frontend route hiding is not trusted as authorization.
- `COLLEGE_ADMIN` access is always scoped to the admin's college.
- `FACULTY` access is scoped to the faculty user's college and assigned subjects.
- `STUDENT` users cannot access management endpoints.
- Student exam APIs validate student ownership, same-college scope, active account status, active college status, assessment assignment, attempt state, server time, and submission locks on the backend.
- Student-safe exam delivery uses permanent snapshots and does not expose correct options, model answers, hidden test cases, evaluator metadata, answer keys, or scoring internals.
- Browser events such as tab visibility changes, reconnects, copy, paste, and fullscreen exits are review signals only. They do not automatically mark misconduct or block a student by themselves.
- Import accepts validated row payloads and records row-level errors. Raw XLSX binary parsing is not implemented yet.
- Coding questions store test cases and starter metadata, but untrusted code execution is not implemented. A real sandbox is required before live coding submissions can run.
- Phase 8 queue monitoring is restricted to `SUPER_ADMIN` and returns queue counts plus sanitized failed-job information only.
- Result moderation requires a reason and stores moderation history; moderation holds prevent publication.
- Security events remain review signals. Reviewers can mark attempts `NORMAL`, `FLAGGED`, `REVIEWED`, or `CLEARED`.
- Redis is used for BullMQ and temporary operational state. Passwords, tokens, correct-answer keys, hidden test cases, and full student answers must not be stored in Redis job payloads.
# Phase 11 AI Security Notes

AI workflows keep provider secrets on the server, reject mock provider mode in production, sanitize provider errors, validate provider JSON, and treat imported document content as untrusted data. Duplicate detection is advisory only. See `docs/AI_SECURITY.md` and `docs/AI_PRIVACY.md`.
# Phase 14 Analytics Security

Analytics and reporting endpoints use JWT authentication, role guards, tenant scoping, faculty assignment checks, published-result restrictions for student views, expiring report files, and export audit logging. CSV output escapes formula-leading values. AI insights use aggregate payloads and are labelled as suggestions requiring human review.

See `docs/ANALYTICS_PRIVACY.md` and `docs/REPORT_SECURITY.md` for the detailed privacy and report download controls.

# Phase 15 Proctoring Security

Proctoring endpoints are protected by JWT, role guards, tenant isolation, and student ownership checks. Event signals are advisory and require human review for final decisions. Evidence APIs return safe metadata views, avoid raw storage-key exposure in student-facing responses, and audit reviewer access.

See `docs/PROCTORING_SECURITY.md`, `docs/PROCTORING_PRIVACY.md`, and `docs/EVIDENCE_RETENTION.md`.

# Phase 16 Coding Security

Coding judge orchestration is protected by JWT guards, role guards, tenant isolation, student attempt ownership checks, source/stdin size limits, and audit logging. The API and worker do not execute untrusted code. Local development uses mock-only results; production rejects mock runner mode.

Student responses redact hidden test input, expected output, evaluator metadata, runner tokens, internal runner URLs, and private source code belonging to other students. Plagiarism matches are advisory and require human review.

See `docs/CODE_RUNNER_SECURITY.md`, `docs/CODE_RUNNER_THREAT_MODEL.md`, `docs/CODING_ASSESSMENTS.md`, and `docs/CODING_PLAGIARISM.md`.
# Phase 18 Security Notes

- Billing secrets stay server-side through environment variables.
- Production rejects mock billing.
- Checkout and portal flows must be provider-hosted or provider-tokenized.
- Tenant billing, support, export, branding, and domain APIs enforce backend tenant isolation.
- Push tokens are hashed before storage.
- Support attachments require tenant authorization.
- PWA service worker excludes APIs, exam attempts, answers, reports, coding submissions, tokens, and proctoring evidence from cache.
- Legal templates are placeholders and do not represent compliance certification.
