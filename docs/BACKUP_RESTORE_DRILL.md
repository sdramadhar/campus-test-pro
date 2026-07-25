# Backup Restore Drill

## Scripts

- `npm run backup:database`
- `npm run verify:backup`
- `npm run restore:database -- --dry-run`

## Drill

1. Create an encrypted database backup in the configured provider.
2. Verify the backup artifact exists and is non-empty.
3. Restore into an isolated staging database.
4. Run `npm run db:migrate:status`.
5. Run `npm run integrity:check`.
6. Run smoke tests against the restored environment.
7. Record backup time, restore time, RPO, RTO, and checksum evidence.

No production launch should proceed without a successful restore drill.
