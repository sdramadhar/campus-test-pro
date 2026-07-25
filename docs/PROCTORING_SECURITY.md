# Proctoring Security

Security controls:

- JWT and role guards on every proctoring route.
- Tenant-scoped session, review, policy, and evidence queries.
- Student ownership checks for student endpoints.
- Idempotent event ingestion with unique `sessionId + idempotencyKey`.
- Bounded event batch size.
- Private evidence metadata responses.
- Evidence access audit rows.
- Result hold/release workflow for review outcomes.
- Retention jobs that skip legal hold and active review evidence.

Risk scores are advisory and reviewer-facing. Manual review decisions are persisted separately from raw event capture.
