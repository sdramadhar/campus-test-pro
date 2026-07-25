# Proctoring

Phase 15 adds review-based exam monitoring for CampusTest Pro.

Core APIs:

- `GET /api/v1/student/assessments/:assessmentId/proctoring-policy`
- `POST /api/v1/student/assessments/:assessmentId/proctoring-consent`
- `POST /api/v1/student/assessments/:assessmentId/system-check`
- `POST /api/v1/student/attempts/:attemptId/proctoring/start`
- `POST /api/v1/student/attempts/:attemptId/proctoring/events/batch`
- `POST /api/v1/student/attempts/:attemptId/proctoring/heartbeat`
- `POST /api/v1/student/attempts/:attemptId/proctoring/evidence`
- `GET /api/v1/proctoring/sessions`
- `GET /api/v1/proctoring/reviews`
- `PATCH /api/v1/proctoring/reviews/:sessionId`
- `GET|POST|PATCH /api/v1/proctoring/policies`

Frontend routes:

- `/student/proctoring`
- `/student/assessments/:assessmentId/proctoring-consent`
- `/student/assessments/:assessmentId/system-check`
- `/proctor/live`
- `/proctor/reviews`
- `/admin/proctoring/settings`
- `/admin/proctoring/policies`
- `/admin/proctoring/retention`
- `/assessments/:id/proctoring`
- `/assessments/:id/proctoring-reviews`

Monitoring records browser/security signals for human review. Events such as fullscreen exit, tab hidden, network disconnect, second session attempts, and manual proctor flags contribute to a risk score and review queue, but do not by themselves declare misconduct.

Tenant isolation is enforced in backend services. College admins, faculty, and students can only access records in their college; students can only access their own sessions.
