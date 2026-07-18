# Environments

Use these templates:

- Local: `.env.example` copied to `.env`
- Staging: `.env.staging.example`
- Production: `.env.production.example`

Production requirements:

- `COOKIE_SECURE=true`
- Explicit `CORS_ORIGINS`
- Strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- `SWAGGER_ENABLED=false` unless protected behind an internal gateway
- `WORKER_REQUIRED=true`
- `DIRECT_DATABASE_URL` for migrations
- `DATABASE_URL` for pooled app connections
- Provider secrets injected by the deployment platform, not committed

Only `NEXT_PUBLIC_*` variables are exposed to the browser.
