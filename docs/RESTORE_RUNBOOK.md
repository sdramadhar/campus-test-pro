# Restore Runbook

1. Declare incident and freeze risky deployments.
2. Identify last known good PostgreSQL backup or managed snapshot.
3. Restore to an isolated environment first.
4. Run migration status and application smoke tests.
5. Validate auth, tenant isolation, exam attempts, results, reports, evidence metadata, and audit logs.
6. Promote restored database only after explicit approval.
7. Rebuild Redis queues from database-backed sweeps where available.
8. Verify object-storage versioning for reports/evidence.
9. Record timeline, RPO/RTO achieved, and follow-up actions.

Never restore production from an unverified backup.
