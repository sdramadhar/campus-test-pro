# TLS and Domain

Suggested domains:

- `app.example.invalid`
- `api.example.invalid`
- `files.example.invalid`

Use managed certificates where possible. Let's Encrypt is acceptable for self-managed edge infrastructure. Enable HSTS only after HTTPS is stable across all subdomains. Set secure cookie domain to the institution-controlled parent domain.

Certificate rotation should be automated and monitored. DNS records must separate staging from production.
