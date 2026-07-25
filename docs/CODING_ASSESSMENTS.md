# Coding Assessments

Phase 16 adds database-backed coding submissions, executions, test-result records, rejudge workflows, faculty review, score override, and runner monitoring foundations.

## Student Workflow

Students can:

- open a coding attempt page;
- choose an enabled language;
- edit starter code;
- save a browser-local draft;
- run public tests;
- submit final code;
- view sanitized submission history and execution summaries.

Student APIs require ownership of the attempt, same-college scope, and an open attempt state.

## Faculty And Admin Workflow

Faculty, College Admin, and Super Admin users can:

- list coding submissions;
- inspect sanitized submission details;
- rejudge submissions;
- hold or release submissions for review;
- apply score overrides with a reason;
- view coding analytics by tenant, assessment, or question route.

## Scoring

Coding questions support exact/trimmed/token/floating/special-judge metadata, partial scoring policies, per-test weights, public/hidden test visibility, language allowlists, starter code per language, expected complexity, and resource-limit metadata.

Approved results are persisted through `CodingEvaluation`, while execution-level details are stored separately in `CodingExecution` and `CodingExecutionTestResult`.
