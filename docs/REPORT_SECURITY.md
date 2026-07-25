# Report Security

Report security controls:

- Tenant scoped report definitions, jobs, files, schedules, and audits.
- Role checks on every report endpoint.
- No password hashes, tokens, hidden test cases, or unpublished student result data in exports.
- CSV formula injection protection for values starting with `=`, `+`, `-`, or `@`.
- Expiring report files.
- Download audit records with report job, file, user, format, and request metadata.

Sensitive report email delivery is disabled unless a production email provider and authorization policy are configured.
