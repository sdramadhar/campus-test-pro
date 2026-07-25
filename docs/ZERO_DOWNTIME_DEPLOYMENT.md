# Zero-Downtime Deployment

Deployment strategy:

- build immutable images tagged by commit SHA;
- run exactly one migration release job;
- use backward-compatible schema changes;
- wait for readiness gates;
- roll web/API/worker deployments gradually;
- verify health, readiness, metrics, worker heartbeat, and active attempt safety;
- roll back application images when health gates fail.

Database rollback is not automatic. Use forward fixes or restore only after incident approval.
