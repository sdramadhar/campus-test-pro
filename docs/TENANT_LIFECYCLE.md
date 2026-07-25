# Tenant Lifecycle

Supported statuses:

- `LEAD`
- `TRIAL`
- `ACTIVE`
- `PAST_DUE`
- `SUSPENDED`
- `CANCELLED`
- `ARCHIVED`

Cancellation does not immediately delete data. Tenants may enter read-only and retention windows, export their data, and be restored while retention permits. Deletion requests and legal holds are stored as foundations for future operations.
