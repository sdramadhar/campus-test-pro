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

Strict browser monitoring is active during a live attempt when the resolved proctoring policy enables proctoring, or when the assessment requires/prefers fullscreen. The student attempt page starts a secure camera check, requests fullscreen, blocks copy, paste, context menu, and restricted shortcuts, records tab/window/fullscreen/network/camera events through the batch proctoring API, sends heartbeats, and stores private camera-snapshot evidence metadata. If a policy enables automatic submission on critical violations, the backend can mark the attempt as `AUTO_SUBMITTED` and create a submission receipt idempotently.

Privacy limitations: CampusTest Pro does not claim biometric identification, emotion analysis, protected-attribute inference, operating-system-wide monitoring, or continuous raw video recording. Browser-based camera checks depend on browser permission support and student hardware availability. Evidence remains private metadata unless a hardened object-storage upload path is configured and reviewed.

Tenant isolation is enforced in backend services. College admins, faculty, and students can only access records in their college; students can only access their own sessions.
