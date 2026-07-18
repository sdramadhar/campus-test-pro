# Workers

Phase 8 adds `apps/worker`, a TypeScript BullMQ worker process backed by Redis and PostgreSQL.

Queues:

- `attempt-expiry`
- `attempt-auto-submit`
- `result-calculation`
- `result-publication`
- `notification`
- `analytics`
- `cleanup`

Worker behavior:

- Uses unique BullMQ job IDs.
- Retries jobs with exponential backoff.
- Records sanitized job status in `BackgroundJobRecord`.
- Runs a periodic database sweep for expired `IN_PROGRESS` attempts.
- Auto-submit is claimed atomically with `autoSubmitClaimedAt` and `autoSubmitClaimedBy`.
- Result calculation is idempotent and upserts result/evaluation records.
- Graceful shutdown closes workers, queues, Redis, and Prisma.

Run locally:

```powershell
npm run dev --workspace apps/worker
```

The delayed queue is not the only source of truth. The database sweep handles late jobs, Redis interruptions, and worker restarts.
