# Proctoring Privacy

CampusTest Pro proctoring is designed as review-based security evidence, not automated accusation.

Not collected by Phase 15:

- Emotion recognition.
- Protected-attribute inference.
- Keystroke content.
- Clipboard content.
- Browsing history outside the exam page.
- Continuous audio or video recording by default.
- Device serial numbers or precise geolocation.

Evidence records are private storage references plus metadata. API responses use safe evidence views and do not expose raw storage keys to students.

Reviewer access to evidence creates `EvidenceAccessAudit` rows. Retention jobs skip legal-hold evidence and evidence tied to active reviews.
