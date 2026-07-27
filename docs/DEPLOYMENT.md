# Deployment

Build immutable images with the commit SHA:

```powershell
docker build -f Dockerfile.api -t registry.example/campustest-api:$env:GITHUB_SHA .
docker build -f Dockerfile.worker -t registry.example/campustest-worker:$env:GITHUB_SHA .
docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_URL=https://api.example.edu -t registry.example/campustest-web:$env:GITHUB_SHA .
```

Release order:

1. Confirm backup or managed snapshot exists.
2. Run a single migration release job with `DIRECT_DATABASE_URL`.
3. Deploy API instances.
4. Deploy workers.
5. Deploy web.
6. Verify `/health`, `/ready`, `/api/v1/system/version`, login, and one student exam flow.

Rollback:

- Application rollback means redeploying the previous image tag.
- Database rollback is not automatic; Prisma migrations are forward-first. Restore backups only after an explicit recovery decision.

Provider option A: Render-style managed platform

- Web service for Next.js.
- API web service for NestJS.
- API build command: `npm ci --include=dev && npm run db:generate && npm run build --workspace apps/api`.
- Background worker service.
- Managed PostgreSQL and Redis.
- Environment-scoped secrets.
- Release command: `npm run db:migrate:deploy`.

Provider option B: AWS ECS/Fargate or Kubernetes

- Separate services/deployments for web, API, and worker.
- ALB or ingress controller with managed TLS.
- RDS PostgreSQL plus RDS Proxy/PgBouncer where appropriate.
- ElastiCache Redis.
- S3-compatible private bucket.
- Autoscaling based on CPU, queue lag, and request latency.

# Phase 19 Deployment Gate

CampusTest Pro is ready for production configuration, not a production launch declaration.

Before production:

- Run `npm run production:check` in the target deployment environment.
- Run Prisma migration status/deploy with the direct database URL.
- Verify health, readiness, Swagger policy, workers, Redis, PostgreSQL, object storage, billing webhooks, email delivery, AI provider access, and code-runner isolation.
- Complete backup restore and k6 staging load evidence.
- Review `docs/PRODUCTION_BLOCKERS.md` before tagging or promoting a release.
