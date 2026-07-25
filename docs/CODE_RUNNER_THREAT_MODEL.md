# Code Runner Threat Model

## Assets

- student submissions and revision history;
- hidden test inputs and expected outputs;
- faculty review decisions and score overrides;
- runner authentication tokens;
- language image metadata;
- tenant-scoped assessment and result data.

## Primary Risks

- untrusted code escaping a sandbox;
- denial of service through CPU, memory, process, or output exhaustion;
- hidden test disclosure;
- cross-tenant submission or result access;
- plagiarism evidence misused as automatic punishment;
- leaking private source code through logs, errors, or dashboards;
- runner tokens committed to source control.

## Phase 16 Mitigations

- API/worker never execute untrusted code.
- Mock mode is blocked in production.
- Student responses redact hidden test details.
- Tenant checks scope submissions, jobs, review tasks, plagiarism jobs, and analytics.
- Source/stdin size limits and basic forbidden-pattern checks run before job creation.
- Review, rejudge, hold, release, score override, and plagiarism actions write audit events.
- Similarity matches require human review before a decision is recorded.

## Open Production Work

Real code execution still requires a hardened isolated executor service. The current gateway is intentionally mock-only.
