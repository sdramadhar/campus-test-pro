# SaaS Architecture

Phase 18 adds a commercial SaaS foundation around the existing college tenant model. `College` remains the tenant root; SaaS lifecycle, onboarding, subscription, entitlement, branding, domain, support, mobile, legal, and export records are tenant-scoped through `collegeId`.

Billing is provider-abstracted. Local development defaults to disabled or mock billing and never charges money. Production rejects mock billing and requires server-side provider secrets before paid checkout can be enabled.

No production launch is claimed. Real launch still requires cloud deployment, monitored backups, secret management, TLS, provider credentials, and staging load validation.
