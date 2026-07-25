# Production Blockers

CampusTest Pro must not be launched as production until these blockers are closed.

## Blockers

- Configure real production secrets through a secret manager.
- Replace mock billing with a real billing provider and verified webhook signing.
- Replace console email with SMTP, Resend, or SendGrid.
- Replace local storage with S3, R2, MinIO, or Azure Blob in a private bucket/container.
- Replace mock AI with a real provider or explicitly disable AI generation.
- Replace mock code execution with remote isolated runners.
- Complete staging deployment with real TLS, reverse proxy, and trusted proxy configuration.
- Complete database backup and restore drill with a real encrypted backup artifact.
- Run k6 staging load tests and publish results before making capacity claims.
- Configure monitoring, alerting, and error tracking endpoints.
- Complete legal review for terms, privacy, proctoring consent, data retention, and billing language.
- Complete security review for high-stakes exam deployments and code execution isolation.

## Development-Only Settings

These values must never be used in production:

- `AI_PROVIDER=mock`
- `BILLING_PROVIDER=MOCK`
- `EMAIL_PROVIDER=console`
- `STORAGE_PROVIDER=local`
- `CODE_RUNNER_MODE=MOCK`
- default development JWT secrets
- local PostgreSQL/Redis credentials
