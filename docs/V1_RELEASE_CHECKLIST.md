# v1.0 Release Checklist

## Code

- Run `npm run db:generate`.
- Run `npm run db:migrate:status`.
- Run `npm run db:seed`.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.
- Run `npm run route:crawl`.
- Run `npm run integrity:check`.
- Run `npm run security:secret-scan`.
- Run `npm run production:check:example`.

## Runtime

- Verify `http://localhost:3000`.
- Verify `http://localhost:4000/health`.
- Verify `http://localhost:4000/ready`.
- Verify `http://localhost:4000/api/docs`.
- Verify `http://localhost:4100/health` when the gateway is running.

## Release

- Review `docs/PRODUCTION_BLOCKERS.md`.
- Review `docs/PRODUCTION_CREDENTIALS.md`.
- Confirm no real secrets are tracked.
- Confirm staging deployment health.
- Confirm backup restore evidence.
- Confirm load-test evidence.
- Tag only after all blockers are resolved.
