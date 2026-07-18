# E2E Testing

Playwright tests live under `e2e/`.

Run locally after starting API, web, worker, PostgreSQL, and Redis:

```powershell
npm run e2e
```

The current suite verifies seeded role login, generic password-reset request behavior, and unauthorized route handling. Broader staging flows should use isolated test data generated only outside production.
