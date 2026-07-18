# Database Pooling

CampusTest Pro supports PgBouncer or a managed PostgreSQL pooler.

Use:

- `DATABASE_URL` for API and worker runtime pooled connections.
- `DIRECT_DATABASE_URL` for migrations and Prisma operations that must bypass transaction pooling.

Guidance:

- Size pools from actual API instance count, worker count, and database limits.
- Avoid running migrations from every API instance.
- Prefer a one-time release job for `npm run db:migrate:deploy`.
- Use transaction pooling only with Prisma-compatible settings.
- Monitor connection wait time, slow queries, lock waits, and queue lag.

The sample `config/pgbouncer.ini` is a starting point, not a universal pool size.
