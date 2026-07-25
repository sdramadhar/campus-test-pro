# Evidence Retention

Proctoring evidence has an `expiresAt` date derived from the policy snapshot on the session.

Retention behavior:

- Evidence under legal hold is not deleted.
- Evidence attached to active reviews is not deleted.
- Expired eligible evidence can be removed by `POST /api/v1/proctoring/retention/run`.
- Retention runs create `ProctoringRetentionJob` records.

The seeded Demo College data includes metadata-only evidence for reviewer workflow testing. No real uploaded files are committed to the repository.
