# Load Testing

CampusTest Pro includes k6 scripts under `load-tests/`.

Run a small local smoke test:

```powershell
$env:BASE_URL="http://localhost:4000"
$env:VUS="50"
$env:DURATION="2m"
k6 run load-tests/student-exam-flow.js
```

Larger stages can be configured with:

- `BASE_URL`
- `TEST_IDENTIFIER`
- `TEST_PASSWORD`
- `VUS`
- `DURATION`

Do not run a 5,000-user test automatically on a local development machine. The script can be pointed toward 200, 500, or higher VU targets only after the database, Redis, API instances, and worker instances are sized for that test.

The presence of load-test scripts is not proof of 5,000-concurrent production capacity. Production readiness requires measured results, infrastructure sizing, database pooling, observability, and failure drills.

## Phase 9 Profiles

```powershell
k6 run -e PROFILE=smoke load-tests/student-exam-flow.js
k6 run -e PROFILE=50 load-tests/student-exam-flow.js
k6 run -e PROFILE=200 load-tests/student-exam-flow.js
k6 run -e PROFILE=500 load-tests/student-exam-flow.js
k6 run -e PROFILE=1000 load-tests/student-exam-flow.js
k6 run -e PROFILE=5000 load-tests/student-exam-flow.js
```

Capacity checklist:

- API CPU and memory
- Worker CPU and memory
- PostgreSQL connections, locks, and slow queries
- Redis latency
- BullMQ queue lag
- Error rate
- p95 and p99 latency
- Auto-submit delay under load
- Result publication delay
