# Enterprise Architecture

CampusTest Pro Phase 17 defines a provider-neutral production target for web, API, workers, code-runner gateway, managed PostgreSQL, managed Redis, private object storage, observability, backups, and disaster recovery.

```mermaid
flowchart LR
  Users["Students, Faculty, Admins"] --> CDN["CDN / WAF"]
  CDN --> Web["Next.js Web Replicas"]
  Web --> LB["Load Balancer / Reverse Proxy"]
  LB --> API["NestJS API Replicas"]
  API --> Pool["PgBouncer / Managed Pooler"]
  Pool --> PG["Managed PostgreSQL Primary"]
  PG -.optional.-> Replica["Read Replica for Analytics"]
  API --> Redis["Managed Redis"]
  API --> Store["Private Object Storage"]
  API --> AI["AI / Email Providers"]
  API --> Gateway["Code Runner Gateway"]
  Gateway --> Runner["Hardened Isolated Runner"]
  Worker["BullMQ Worker Replicas"] --> Pool
  Worker --> Redis
  Worker --> Store
  API --> OTEL["OpenTelemetry Collector"]
  Worker --> OTEL
  Gateway --> OTEL
  OTEL --> Metrics["Prometheus / Grafana"]
  OTEL --> Logs["Loki or OpenSearch"]
```

The API remains stateless. PostgreSQL is the source of truth for exams, attempts, submissions, results, audit records, and operational records. Redis is used for queues, rate limits, presence, heartbeats, and cache with TTLs; it must not store raw answers, hidden tests, credentials, or private evidence.

The code-runner gateway remains a control-plane boundary. Real untrusted execution belongs in a separate hardened runner with no data-plane access to PostgreSQL or Redis.
