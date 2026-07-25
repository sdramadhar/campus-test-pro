# Environment Configuration

Supported environments are `local`, `test`, `staging`, and `production`. Local/test may use development-safe defaults. Staging/production fail fast when required URLs, direct migration database URL, internal token, and production-safe secrets are absent.

Required staging/production categories:

- app identity: `APP_ENV`, `APP_VERSION`, `GIT_COMMIT_SHA`
- URLs: `FRONTEND_URL`, `API_URL`, `CORS_ORIGINS`
- data: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`
- object storage: `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION`
- auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_TOKEN`
- observability: `ERROR_TRACKING_DSN`, `OTEL_EXPORTER_ENDPOINT`
- runner: `CODE_RUNNER_URL`, `CODE_RUNNER_INTERNAL_TOKEN`
- controls: `MAINTENANCE_MODE`, `FEATURE_FLAGS`

`.env` remains ignored. Only `.env.example`, `.env.staging.example`, and `.env.production.example` should be committed, and they must contain placeholders only.
