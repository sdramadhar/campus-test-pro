# Redis Production

Redis is used for BullMQ queues, rate limiting, presence, proctoring heartbeat summaries, cache, and code-runner queue coordination.

Production requirements:

- TLS and authentication;
- app-specific key prefixes;
- TTLs on transient keys;
- no raw answers, hidden tests, private evidence, credentials, cookies, or source code;
- memory limits and eviction policy matched to queue durability needs;
- separate code-execution queue prefix when runner workloads grow;
- reconnect and retry limits;
- monitoring for latency, memory, rejected connections, and queue lag.

Redis persistence helps recover queues, but it does not replace PostgreSQL backups.
