# Release Readiness

CampusTest Pro is ready for production configuration work, not for a real production launch claim.

Current decision: `READY_FOR_PRODUCTION_CONFIGURATION`

The Phase 19 implementation adds release-readiness checks, production environment validation, integrity and backup drill scripts, route crawling, release workflow foundations, and admin visibility for release blockers.

## Readiness Classes

- `READY`: implemented and covered by static checks or automated tests in this repository.
- `READY_WITH_CONFIGURATION`: implemented, but requires real deployment configuration, credentials, or provider contracts.
- `BLOCKED`: must be completed before production launch.
- `DEVELOPMENT_ONLY`: allowed only in local development or tests.
- `NOT_IMPLEMENTED`: intentionally not claimed for this release.

## Component Status

| Area                      | Status                   | Notes                                                                                                                |
| ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Frontend application      | READY                    | Next.js build and protected route foundations are included.                                                          |
| API application           | READY                    | NestJS health, readiness, Swagger, auth, tenant, SaaS, exam, AI, coding, analytics, and system modules are included. |
| Worker                    | READY                    | Queue and heartbeat foundations are present; production needs managed Redis and process supervision.                 |
| Code runner gateway       | READY_WITH_CONFIGURATION | Gateway foundation exists; production must use isolated remote runners.                                              |
| PostgreSQL                | READY_WITH_CONFIGURATION | Prisma schema and migrations exist; production requires managed HA PostgreSQL and backup validation.                 |
| Redis                     | READY_WITH_CONFIGURATION | Queue/session cache foundations exist; production requires managed Redis with persistence and monitoring.            |
| Object storage            | READY_WITH_CONFIGURATION | Local storage is development-only; production must use S3/R2/Azure-compatible storage.                               |
| Billing                   | READY_WITH_CONFIGURATION | Mock billing is development-only; production requires a real provider and webhook secret.                            |
| AI providers              | READY_WITH_CONFIGURATION | Provider adapters exist; mock AI is development/test only.                                                           |
| Email                     | READY_WITH_CONFIGURATION | Console email is development-only; production requires SMTP/Resend/SendGrid.                                         |
| Monitoring                | READY_WITH_CONFIGURATION | OTEL/error tracking variables and docs exist; production needs real endpoints and alert routing.                     |
| Load validation           | BLOCKED                  | k6 profiles exist, but production capacity is not claimed without staging results.                                   |
| Legal/compliance sign-off | BLOCKED                  | Legal templates and policies need professional review.                                                               |

## Automated Checks

- `npm run production:check`
- `npm run production:check:example`
- `npm run integrity:check`
- `npm run verify:backup`
- `npm run restore:database -- --dry-run`
- `npm run route:crawl`
- `npm run security:secret-scan`
- `npm run security:audit`
- `npm run iac:validate`

## Runtime Endpoints

- `GET /api/v1/system/version`
- `GET /api/v1/system/release-readiness`
- `GET /api/v1/system/jobs`
- `GET /api/v1/system/infrastructure`
- `GET /api/v1/system/capacity`
- `GET /api/v1/system/backups`
- `GET /api/v1/system/alerts`
- `GET /api/v1/system/metrics`

Protected release endpoints require `SUPER_ADMIN`.
