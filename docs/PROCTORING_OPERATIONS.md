# Proctoring Operations

Operational roles:

- `SUPER_ADMIN` can inspect platform-wide proctoring data.
- `COLLEGE_ADMIN` can manage policies and reviews within their college.
- `FACULTY` can act as a live proctor and reviewer within their college.
- `STUDENT` can only access their own student-facing policy and session status.

Recommended workflow:

1. Create or activate a proctoring policy.
2. Verify student consent and system check.
3. Monitor live sessions from `/proctor/live`.
4. Use warnings and messages as neutral support interventions.
5. Flag only when human review is required.
6. Review evidence from `/proctor/reviews`.
7. Hold or release results based on reviewer decision.
8. Run retention after configured expiry windows.
