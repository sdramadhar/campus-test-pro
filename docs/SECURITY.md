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
