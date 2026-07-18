# Observability

Phase 8 adds structured worker logs with:

- timestamp
- level
- service
- message
- sanitized metadata

Production monitoring should add:

- request correlation IDs
- route/status/duration logs in the API
- job ID and queue labels for worker logs
- Prometheus metrics for API latency, error rate, queue depth, failed jobs, database latency, and Redis latency
- Grafana dashboards for exam operations
- OpenTelemetry tracing across API, worker, PostgreSQL, and Redis

Never log passwords, tokens, full student answers, correct-answer keys, hidden test cases, or raw session tokens.

## Phase 9 Additions

Configuration hooks:

- `OTEL_ENABLED`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `SENTRY_DSN`
- `LOG_LEVEL`
- `RELEASE_VERSION`
- `COMMIT_SHA`
- `BUILD_TIMESTAMP`

API readiness checks PostgreSQL, Redis, queues, migration state, and worker heartbeat when workers are required. Worker instances write `WorkerHeartbeat` rows with an expiry timestamp so multiple workers can be monitored without assuming a singleton.
