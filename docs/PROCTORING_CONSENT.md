# Proctoring Consent

Proctoring policies can require explicit consent before a student starts a monitored assessment.

The student-facing policy endpoint returns:

- What monitoring is enabled.
- Retention days.
- Support contact.
- Privacy notice.
- A clear list of monitoring not performed.

Consent decisions are stored in `ProctoringSession` and recorded as `PROCTORING_CONSENT` audit events. Declining consent cancels the proctoring session and returns a neutral student message.
