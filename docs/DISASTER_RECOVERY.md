# Disaster Recovery

RPO and RTO are organizational targets and must be validated with the actual provider. Suggested planning targets:

- PostgreSQL: point-in-time recovery target approved by the institution.
- Redis: recover queues from database-backed sweeps where possible.
- Object storage: versioning, retention, and replication for critical evidence.
- Code runner: degrade coding execution and keep exam attempts available where possible.

Scenarios:

- database restore
- Redis loss
- object-storage outage
- region outage
- failed deployment
- accidental migration
- corrupted report files
- lost worker queue
- code-runner outage
