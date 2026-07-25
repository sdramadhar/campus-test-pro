# Database Production

API and worker runtime traffic should use pooled `DATABASE_URL`. Migrations and backup scripts should use `DIRECT_DATABASE_URL`. PgBouncer transaction pooling or managed pooling protects PostgreSQL from connection storms during exams.

Guidance:

- keep API and worker Prisma clients bounded by replica count;
- use a single migration Job per release;
- set statement, connection, and transaction timeouts at the database or pooler;
- run analytics/reporting queries through snapshots or optional read replicas;
- keep exam writes on the primary only;
- review slow queries before high-stakes exam windows;
- do not log query parameters containing answers, source code, evidence keys, or tokens.

`infrastructure/pgbouncer/pgbouncer.ini` is a foundation and must be adapted to the chosen managed database.
