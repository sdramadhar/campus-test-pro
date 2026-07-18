# Incident Response

First response:

1. Preserve logs and deployment metadata.
2. Rotate affected secrets.
3. Revoke active refresh tokens if account compromise is suspected.
4. Enable maintenance mode when student traffic must pause safely.
5. Check audit logs, email deliveries, queue failures, and worker heartbeats.

Communication:

- Notify administrators with confirmed scope.
- Avoid exposing student answers or secret values in incident channels.

Recovery:

- Patch and redeploy immutable images.
- Run health/readiness checks.
- Validate auth, attempts, review queues, and result publication.
