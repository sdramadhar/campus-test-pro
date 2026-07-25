# OWASP Review

## Covered Foundations

- Authentication uses hashed passwords, JWT access tokens, rotating refresh tokens, logout revocation, and disabled-account rejection.
- Authorization uses backend role guards and tenant-scoped service filters.
- Secrets are read from environment variables and scanned before release.
- Production validation rejects development-only mock providers.
- Swagger and diagnostics are controlled by environment.
- HTTP-only cookies are used where browser sessions apply.
- Login and sensitive endpoints include rate-limiting foundations.
- Uploaded content is treated as untrusted input.
- Code execution is isolated behind a gateway and mock execution is forbidden in production.

## Remaining Production Work

- Run DAST against staging.
- Add WAF rules for credential stuffing and upload abuse.
- Verify cookie domain, secure, same-site, and proxy headers behind the real ingress.
- Verify CSP, HSTS, frame, referrer, and permissions-policy headers at the edge.
- Complete penetration testing for tenant isolation, assessment access, billing webhooks, and code runner boundaries.
