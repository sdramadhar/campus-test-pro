# Scaling

Phase 7 is designed around database-backed attempt state so API instances do not rely on in-memory exam timers. Answer saves, submissions, receipts, evaluations, and security events are persisted in PostgreSQL, with Redis already available for rate limiting and future queues.

Production scale work still requires:

- Load testing for the target concurrency profile, including the requested 5,000 concurrent exam-taker scenario.
- PostgreSQL sizing, connection pooling, query analysis, backup/restore testing, and migration rehearsal.
- Redis sizing for rate limits, reconnect bursts, and future BullMQ job queues.
- A real background worker deployment for expired-attempt auto-submit and expensive result processing.
- A secure code execution sandbox before coding answers can be run.
- Observability for API latency, answer-save error rate, job failures, database locks, and submission spikes.

The local Docker Compose stack is suitable for development verification, not capacity proof.

Phase 8 adds a BullMQ worker app and k6 scripts. These improve operational readiness, but production scale still requires measured tests, multiple API/worker instances, database pooling such as PgBouncer or managed pooling, Redis sizing, and observability dashboards.
