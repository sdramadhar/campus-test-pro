# Security Checklist

- Strong JWT secrets in staging/production.
- Secure, HttpOnly cookies in production.
- Explicit CORS origins; no wildcard credentials.
- Swagger disabled or protected in production.
- Rate limits for login and password reset.
- Refresh-token rotation and revocation.
- Tenant isolation enforced on backend.
- Validation pipes with whitelist enabled.
- Security headers enabled.
- Object storage private by default.
- Code execution disabled unless an isolated external runner exists.
- Logs redact passwords, tokens, cookies, answers, answer keys, and hidden tests.

This checklist is not a formal security certification.
