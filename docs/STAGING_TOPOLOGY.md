# Staging Topology

Staging mirrors production shape with smaller replica counts and non-production data. It is the only place where high-capacity load tests should run before any capacity claim.

Staging must use:

- separate database, Redis, object storage bucket, DNS, secrets, and OAuth/email credentials;
- production-like connection pooling and observability;
- synthetic users and assessments only;
- explicit cleanup for generated load-test data.

```mermaid
flowchart LR
  K6["k6 Load Generator"] --> Edge["Staging Edge"]
  Edge --> Web["Staging Web"]
  Edge --> API["Staging API"]
  API --> DB["Staging PostgreSQL"]
  API --> Redis["Staging Redis"]
  API --> Store["Staging Object Storage"]
  Worker["Staging Workers"] --> DB
  Worker --> Redis
  API --> Metrics["Staging Monitoring"]
```

Do not run the 5,000-user profile locally. Use staging, controlled schedules, and documented results.
