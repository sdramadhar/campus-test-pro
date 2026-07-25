# Production Topology

Production should run at minimum:

- 2+ web replicas
- 2+ API replicas
- 2+ worker replicas
- 2+ code-runner gateway replicas
- managed PostgreSQL with backups and point-in-time recovery
- managed Redis with TLS/auth
- private object storage with versioning and retention
- WAF/CDN/load balancer
- centralized logs, metrics, traces, alerts

```mermaid
flowchart TB
  subgraph Public["Public Edge"]
    DNS["DNS app/api/files.example.invalid"]
    WAF["WAF + CDN"]
    LB["HTTPS Load Balancer"]
  end
  subgraph Private["Private Kubernetes / Runtime"]
    Web["Web HPA 2-6"]
    API["API HPA 2-8"]
    Worker["Worker HPA/KEDA 2-10"]
    Gateway["Runner Gateway 2+"]
  end
  subgraph Managed["Managed Data Services"]
    PG["PostgreSQL Primary"]
    Pool["Pooler"]
    Redis["Redis"]
    Store["Object Storage"]
  end
  DNS --> WAF --> LB
  LB --> Web
  LB --> API
  API --> Pool --> PG
  Worker --> Pool
  API --> Redis
  Worker --> Redis
  API --> Store
  Gateway --> Runner["Isolated Runner Pool"]
```

Production deployments use immutable image tags based on commit SHA and a single migration Job. Migrations must not run in every API replica.
