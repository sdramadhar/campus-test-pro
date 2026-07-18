# CI/CD

CI is defined in `.github/workflows/ci.yml`.

It runs:

- `npm ci`
- `npm run format:check`
- Prisma generate, migrate deploy, migration status, dev seed
- lint
- typecheck
- integration tests
- production build
- dependency audit
- Docker image build validation

Deployment workflows are templates:

- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

They use environment-scoped secrets, immutable commit SHA tags, migration release jobs, and health-check gates. Provider-specific login/deploy commands must be filled in by the chosen platform.
