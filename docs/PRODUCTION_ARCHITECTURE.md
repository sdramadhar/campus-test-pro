# Production Architecture

CampusTest Pro production is designed as stateless web/API services plus stateful managed dependencies.

Core services:

- Next.js web app behind a load balancer or reverse proxy.
- NestJS API with multiple stateless instances.
- BullMQ worker with multiple instances and DB-backed idempotency.
- PostgreSQL with managed backups and either PgBouncer or a managed pooler.
- Redis for BullMQ, rate limits, and temporary session indicators.
- Object storage for future logos, import files, reports, and question media.
- Email provider behind the `EmailService` abstraction.
- Monitoring, alerting, centralized logs, and error tracking.

Traffic flow:

1. Browser connects through HTTPS load balancer or reverse proxy.
2. `/api/*`, `/health`, and `/ready` route to API.
3. Frontend routes route to Next.js.
4. API and workers use pooled `DATABASE_URL`; migration jobs use `DIRECT_DATABASE_URL`.
5. Workers process Redis/BullMQ jobs and write heartbeat rows checked by readiness.

Environment separation:

- Local: `docker-compose.yml`, console email, local Redis/PostgreSQL ports exposed.
- Test: ephemeral CI PostgreSQL/Redis services.
- Staging: production-like Compose or managed services with staging secrets.
- Production: managed database/Redis, explicit CORS, secure cookies, Swagger disabled or protected.

No provider credentials belong in this repository.
