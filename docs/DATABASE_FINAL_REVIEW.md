# Database Final Review

## Current State

- Prisma schema covers tenants, auth, academic management, assessments, attempts, question bank, AI workflows, proctoring, analytics, coding judge foundations, SaaS billing, support, legal documents, and system operations.
- Migration history is validated through `npm run db:migrate:status`.
- Seed data is development/demo oriented and must not be used as production tenant data.

## Integrity Checks

Run:

```bash
npm run integrity:check
```

The checker looks for orphan records, expired active sessions, stale active jobs, broken subscription records, missing tenant relations, and known consistency risks. Warnings require operator review before launch.

## Production Requirements

- Use pooled URLs for runtime traffic and direct URLs for migrations.
- Enable automated backups with encryption.
- Test restore into an isolated database before launch.
- Monitor connection counts, slow queries, locks, replication lag, and migration runtime.
