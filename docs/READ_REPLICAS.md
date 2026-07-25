# Read Replicas

Read replicas are optional and must be used only for analytics, reports, dashboards, and large exports. The primary database remains the source of truth.

Rules:

- exam writes never go to a replica;
- answer saves, submissions, scoring, and audit logs use primary only;
- UI should label replica-backed analytics as non-real-time;
- tolerate replica lag;
- fallback to primary only when safe and rate-limited;
- feature flag the behavior per environment.
