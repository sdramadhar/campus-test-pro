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
- dependency audit policy with documented accepted upstream risks
- secret scan
- IaC validation
- Kubernetes manifest validation
- Docker image build validation
- container scan foundation through the separate Trivy workflow
- CodeQL workflow foundation

Deployment workflows are templates:

- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

They use environment-scoped secrets, immutable commit SHA tags, migration release jobs, and health-check gates. Provider-specific login/deploy commands must be filled in by the chosen platform.

Production requires manual environment approval. CD must run a single migration job, smoke tests, health/readiness checks, optional k6 smoke, and rollback gates. Cloud credentials are not embedded in workflows.

See `docs/DEPENDENCY_RISK_REGISTER.md` for the current npm audit allowlist and required review process.
