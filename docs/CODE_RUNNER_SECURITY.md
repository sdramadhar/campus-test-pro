# Code Runner Security

Phase 16 separates coding-assessment orchestration from untrusted-code execution. The NestJS API stores submissions, queues runner jobs, records sanitized execution results, and exposes review workflows. It does not spawn compilers or run student code inside the API or worker process.

## Current Isolation Model

- `DISABLED`: rejects all execution requests.
- `MOCK`: deterministic development/test evaluation. No untrusted code is executed.
- `REMOTE_RUNNER`: configuration placeholder for a separately hardened runner service.
- `DOCKER_ISOLATED`: schema/config placeholder for a future sandboxed executor.

The local `apps/code-runner-gateway` service intentionally implements only `MOCK` execution. It returns sanitized mock results and refuses real execution modes so development machines do not accidentally become unsafe judge hosts.

## Required Production Controls

A production runner must be deployed as a separate trust boundary with:

- no Docker socket mounts;
- no privileged containers;
- no host networking;
- read-only runner filesystems where possible;
- per-job CPU, memory, process, wall-clock, and output limits;
- network disabled for executed submissions unless a problem explicitly requires it;
- immutable language image versions;
- non-root execution users;
- temporary work directories removed after each job;
- sanitized stdout, stderr, compiler output, and internal error messages;
- authenticated API-to-runner calls with server-only tokens;
- audit records for submit, run, rejudge, cancel, hold, release, score override, and plagiarism review actions.

## Student Data Protection

Student-facing APIs never return hidden test input, expected output, private evaluator metadata, runner internals, raw source from other students, runner tokens, or internal service URLs.

## Threat Notes

Phase 16 blocks obvious dangerous source patterns before a job is accepted, but static checks are only a defense-in-depth signal. They are not a replacement for process isolation, resource limits, and network egress control.
