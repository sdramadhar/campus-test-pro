# Production Support Runbook

## First Response

- Check `/health`, `/ready`, and `/api/v1/system/release-readiness`.
- Check worker heartbeats and `/api/v1/system/jobs`.
- Check PostgreSQL and Redis metrics.
- Check billing, email, AI, storage, and code runner provider dashboards.

## Common Incidents

- Failed login surge: review rate limits, IP reputation, and audit logs.
- Exam submission delay: check queues, Redis, workers, and database locks.
- Billing webhook retries: verify idempotency keys and provider signature status.
- AI generation failures: verify provider status, quotas, and prompt version.
- Upload failures: verify storage provider credentials and object limits.

## Escalation

Escalate security incidents immediately. Preserve audit logs, queue records, provider event IDs, and database snapshots.
