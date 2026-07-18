# Backup And Recovery

Backup options:

- Managed PostgreSQL snapshots.
- Logical backups using `scripts/backup-postgres.ps1`.
- Periodic application exports for reports where needed.

Restore:

```powershell
$env:DIRECT_DATABASE_URL="postgresql://..."
.\scripts\restore-postgres.ps1 -BackupFile .\backups\campustest.dump -ConfirmProduction
```

Requirements:

- Verify backups by restoring into a non-production database.
- Define RPO/RTO per deployment; this repo does not guarantee them.
- Redis data is not the permanent source of truth. BullMQ and rate-limit Redis should use persistence where operationally useful.

Disaster checklist:

1. Freeze writes if needed.
2. Identify last known good backup.
3. Restore PostgreSQL.
4. Start Redis.
5. Run readiness checks.
6. Verify auth, exam attempt recovery, review queues, and results.
