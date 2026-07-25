# Code Runner Operations

## Environment

Set code-runner values through environment variables only. Keep real runner tokens outside Git.

- `CODE_RUNNER_MODE`: `DISABLED`, `MOCK`, `DOCKER_ISOLATED`, or `REMOTE_RUNNER`.
- `CODE_RUNNER_URL`: remote runner base URL when using a hardened runner service.
- `CODE_RUNNER_INTERNAL_TOKEN`: server-only token for API-to-runner calls.
- `CODE_RUNNER_TIMEOUT_MS`: per-job timeout budget.
- `CODE_RUNNER_MAX_SOURCE_BYTES`: maximum submitted source size.
- `CODE_RUNNER_MAX_STDIN_BYTES`: maximum custom stdin size.
- `CODE_RUNNER_MAX_OUTPUT_BYTES`: maximum retained output size.
- `CODE_RUNNER_DEFAULT_CPU_LIMIT`: default CPU quota hint.
- `CODE_RUNNER_DEFAULT_MEMORY_MB`: default memory limit hint.
- `CODE_RUNNER_DEFAULT_PROCESS_LIMIT`: default process limit hint.
- `CODE_RUNNER_ALLOWED_LANGUAGES`: comma-separated language allowlist.

Production rejects `MOCK` mode and requires remote runner URL/token values for `REMOTE_RUNNER`.

## Local Gateway

The local gateway is a safe mock endpoint:

```powershell
npm run dev --workspace apps/code-runner-gateway
```

Health:

```text
GET http://localhost:4100/health
```

The gateway does not compile or execute user code.

## Monitoring

Use:

- `GET /api/v1/code-runner/health`
- `GET /api/v1/code-runner/languages`
- `GET /api/v1/code-runner/images`
- `GET /api/v1/coding/jobs/:jobId`
- `GET /api/v1/analytics/coding`

Runner failures are stored in PostgreSQL. Redis is used for operational queues and rate limiting, not for hidden tests or private source exchange.
