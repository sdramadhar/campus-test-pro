# Alerting Runbook

Alert on:

- API readiness failure
- high API error rate
- high p95/p99 latency
- database unavailable
- Redis unavailable
- worker heartbeat missing
- queue backlog high
- auto-submit or result-calculation failures
- code-runner failures
- object-storage failures
- backup failures
- disk or memory pressure
- unusual login failures

Alerts must include service, environment, severity, correlation ID where available, and runbook link. Alerts must not include answers, source code, hidden tests, private evidence, cookies, tokens, or credentials.
