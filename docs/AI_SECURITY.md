# AI Security

CampusTest Pro treats all AI inputs and outputs as untrusted.

- Provider API keys are server-side environment variables only and are never sent to the frontend.
- `AI_FEATURE_ENABLED=false` disables AI endpoints.
- `AI_PROVIDER=mock` is for development/test only and is rejected during production startup.
- Document text, syllabus notes, and imported content cannot override system instructions.
- Provider output is schema-validated before it is stored.
- AI-generated and imported questions require human review before they can enter the Question Bank.
- Approved AI/imported questions are saved as `DRAFT`; they are not activated automatically.
- Provider errors are normalized and sanitized.
- Duplicate detection is advisory and never auto-deletes content.
- OCR is not claimed unless `OCR_PROVIDER` is configured.
