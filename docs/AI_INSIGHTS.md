# AI Insights

AI insights are advisory. Phase 14 stores generated insight records with aggregate payloads, source, confidence, reviewer status, reviewer notes, and review timestamps.

Rules:

- No unnecessary student personal data is sent to insight generation.
- No live provider call is made when server-side keys are absent.
- Mock-style advisory output is limited to development and test behavior.
- Insights must be reviewed, dismissed, or marked useful by an authorized human.
- Insights are not guaranteed facts and must not directly trigger punitive decisions.
