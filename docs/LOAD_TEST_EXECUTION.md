# Load Test Execution

## Profiles

`load-tests/student-exam-flow.js` includes smoke, 50, 200, 500, 1000, 2500, and 5000-user profiles.

## Policy

The repository does not claim support for 5,000 concurrent students until a staging run passes with production-like PostgreSQL, Redis, worker, code runner, object storage, and monitoring.

## Command

```bash
npm run k6:smoke
```

For larger profiles, run k6 directly with the required `PROFILE` environment variable in staging and archive the HTML/JSON results outside Git.
