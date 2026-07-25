# Production Credentials

No production credential values belong in Git.

## Required Secret Classes

- Database pooled URL and direct migration URL.
- Redis URL.
- JWT access and refresh secrets.
- Application encryption key.
- Billing secret key and webhook secret.
- Email provider credentials.
- Object storage access key and secret.
- Backup encryption key identifier.
- AI provider API keys.
- Code runner internal token.
- Internal service token.
- Error tracking DSN.
- Push notification private key, when enabled.

## Rotation

- Store secrets in the deployment platform secret manager.
- Rotate provider credentials before first production launch.
- Rotate webhook secrets after any failed security review.
- Rotate JWT secrets with a planned session invalidation window.

## Validation

Use `npm run production:check` against the real deployment environment. The script reports only key names and statuses, never secret values.
