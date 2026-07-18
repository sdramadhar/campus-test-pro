# Database

CampusTest Pro uses PostgreSQL with Prisma migrations.

Phase 6 adds:

- `QuestionOption`, `Tag`, `QuestionTag`
- `CodingQuestion`, `TestCase`, `QuestionAttachment`
- `QuestionImportJob`, `QuestionImportError`
- `AssessmentSection`, `AssessmentQuestion`
- `AssessmentAssignment`, `AssessmentBatchAssignment`, `AssessmentStudentAssignment`

The existing `Question` and `Assessment` tables are evolved in place so existing assessment/submission history remains intact. Question and assessment records include `collegeId` indexes for tenant isolation, subject/type/difficulty/status indexes for filtering, and soft-delete fields where lifecycle history should be preserved.

## Phase 7 Exam Engine

Phase 7 adds:

- `TestAttempt`, `AttemptSection`, and `AttemptQuestion` for server-controlled student attempts and permanent question snapshots.
- `StudentAnswer` and `AnswerRevision` for idempotent answer upserts, marked-for-review state, optimistic answer versions, and audit-friendly answer history.
- `AttemptEvent` and `AttemptSecurityFlag` for non-invasive exam event logging.
- `SubmissionReceipt` for idempotent final submission receipts.
- `Result`, `SectionResult`, and `ObjectiveAnswerEvaluation` for persisted scoring and result publication.
- `ManualReviewTask` for descriptive and short-answer review foundations.

Important indexes include attempt status, expiry time, college scope, assessment/student attempt uniqueness, and student-assessment lookup. The attempt snapshot stores student-safe metadata separately from evaluator metadata so student APIs can render the exam without exposing answer keys.

## Phase 8 Operations

Phase 8 adds:

- `BackgroundJobRecord` for sanitized queue state and failed-job visibility.
- `Notification` for in-app and future email-provider notifications.
- `AttemptSession` for per-attempt session policy foundations.
- `AttemptSecurityReview` and `AttemptSecurityFlag.reviewStatus` for security-event review workflow.
- `ResultModeration` and moderation fields on `Result` for holds, releases, score-change history, and auditability.
- Expiry job and atomic auto-submit claim fields on `TestAttempt`.

These tables preserve PostgreSQL as the permanent source of truth. Redis/BullMQ improves scheduling and retry behavior, but delayed jobs are backed by database sweeps.
