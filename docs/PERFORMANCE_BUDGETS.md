# Performance Budgets

Initial budgets for staging validation:

- API p95 below 1s for exam flows
- API p99 below 2s for exam flows
- answer save error rate below 1%
- submission error rate below 0.5%
- queue lag below 30s during normal exams
- database pool saturation below 80%
- Redis p95 below 20ms

Review Next.js bundle size, API serialization, N+1 queries, indexes, connection pool use, Redis keys, report streaming, analytics aggregation, and question snapshot payload size before large exams.
