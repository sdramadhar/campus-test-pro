# Analytics

Phase 14 adds a server-side analytics architecture backed by PostgreSQL. The API computes platform, college, faculty, student, assessment, question, subject, topic, comparison, leaderboard, report, and insight views without relying on browser-side aggregation.

Key formulas:

- Completion rate: submitted, auto-submitted, evaluated, or under-review attempts divided by assigned or started attempts, depending on scope.
- Participation rate: started attempts divided by assigned active students.
- Median: sort percentages ascending; use the center value, or average the two center values for an even sample.
- Percentile: count of published scores below or equal to the score divided by eligible published scores.
- Measured question difficulty: based on observed correctness when sample size is at least 5; it never overwrites approved difficulty automatically.

Redis cache keys are tenant, role, date-range, and endpoint aware. PostgreSQL remains the source of truth.
