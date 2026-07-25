# Capacity Testing

k6 profiles are defined in `load-tests/student-exam-flow.js`:

- smoke
- 50
- 200
- 500
- 1000
- 2500
- configurable 5000

Do not run 5,000 users locally. Staging tests must record request count, error rate, p95, p99, CPU, memory, database connections, Redis latency, queue lag, worker throughput, code-runner throughput, answer-save failures, submission failures, and autoscaling events.

Capacity is a measured result, not a configuration claim.
