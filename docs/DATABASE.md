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
# Phase 11 AI Data Model

Phase 11 adds tables for:

- `AiGenerationJob`, `AiGenerationRequest`, `AiGenerationResult`
- `AiUsageRecord`, `AiReviewDecision`, `AiPromptTemplate`, `AiProviderFailure`
- `DocumentImportJob`, `ImportedDocument`, `DocumentChunk`, `ExtractedQuestionCandidate`, `ImportValidationError`
- `QuestionDuplicateCandidate`
- `Syllabus`, `SyllabusUnit`, `SyllabusTopic`
- `AssessmentBlueprint`

These records are college-scoped where applicable and link back to existing users, subjects, questions, and assessments. Approved AI/import candidates create existing `Question` rows with `QuestionStatus.DRAFT`.
# Phase 14 Analytics Data

Phase 14 adds analytics metadata tables rather than duplicating raw answer payloads: `AnalyticsSnapshot`, `AnalyticsAggregationJob`, `ReportDefinition`, `ReportGenerationJob`, `ReportFile`, `ReportSchedule`, `SavedDashboard`, `SavedFilter`, `AnalyticsInsight`, `StudentPerformanceSnapshot`, `AssessmentPerformanceSnapshot`, `QuestionPerformanceSnapshot`, `LeaderboardSnapshot`, `BenchmarkSnapshot`, and `ExportAudit`.

Raw attempts, answers, results, questions, assignments, and AI usage remain the source of truth. Snapshot tables are indexed by tenant, assessment, student, question, status, and date where appropriate.

# Phase 15 Proctoring Data

Phase 15 adds:

- `ProctoringPolicy`
- `ProctoringSession`
- `ProctoringEvent`
- `ProctoringWarning`
- `ProctoringEvidence`
- `EvidenceAccessAudit`
- `IdentityCheck`
- `EnvironmentCheck`
- `DeviceSession`
- `SessionHeartbeat`
- `ProctoringReview`
- `ProctoringReviewDecision`
- `ProctoringOverride`
- `ProctoringRetentionJob`
- `LiveProctorAssignment`
- `LiveProctorNote`

Records are college-scoped and indexed by tenant, assessment, student, session, status, and timestamps. Evidence stores private storage keys and safe metadata; student-facing APIs return safe evidence views rather than raw storage references.
