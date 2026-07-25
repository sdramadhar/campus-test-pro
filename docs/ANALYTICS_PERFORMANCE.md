# Analytics Performance

Analytics queries use tenant filters, date-range validation, page-size limits, comparison group limits, report row limits, and targeted Prisma selects. Phase 14 adds indexes for analytics snapshots, report jobs/files, leaderboard snapshots, benchmarks, insights, student snapshots, assessment snapshots, question snapshots, status, dates, owners, and tenant columns.

Limits:

- Analytics date range: maximum 366 days for custom ranges.
- Comparison groups: maximum 8.
- Report rows: maximum 5,000 rows per synchronous local generation.
- Dashboard cache TTL: 60 seconds.

Large exports should be moved to BullMQ streaming jobs with object storage before production-scale use. Materialized views may be added for high-volume score distributions and question-performance rollups after real load testing.
