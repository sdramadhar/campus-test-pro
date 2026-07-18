# Code Execution Security

CampusTest Pro does not execute untrusted coding submissions in the local Phase 8 foundation.

A future coding runner must use a secure isolated execution service with:

- one-time isolated container or microVM per run
- non-root user
- no outbound network
- CPU limit
- memory limit
- process limit
- execution timeout
- read-only filesystem where possible
- temporary workspace destroyed after execution
- language-specific images
- hidden test protection
- queue isolation
- strict rate limiting
- sanitized logs

The current student UI clearly states that code execution is unavailable until this sandbox exists. The platform must not pretend to run code without a real sandbox.

## Phase 9 Gateway Contract

Phase 9 adds `POST /api/v1/code-runner/jobs` as a gateway contract. The API stores lifecycle metadata and either refuses execution when `CODE_RUNNER_MODE=disabled` or returns clearly labeled mock results when `CODE_RUNNER_MODE=mock` in non-production environments.

Production must use `CODE_RUNNER_MODE=external` with an isolated runner provider. `CODE_RUNNER_MODE=mock` is rejected by production environment validation.
