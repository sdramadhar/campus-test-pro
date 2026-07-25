# Database Capacity

Track capacity using staging measurements:

- active attempts
- answer-save write rate
- submission write rate
- result-calculation throughput
- database CPU
- database memory
- active connections
- pool saturation
- lock waits
- p95 and p99 query latency

Read replicas are optional for dashboards, reports, and exports. They must tolerate lag and never handle exam writes. Fallback to primary only when the user-facing workflow can tolerate the extra load.

No 5,000-student capacity claim is made until recorded staging results prove the target.
