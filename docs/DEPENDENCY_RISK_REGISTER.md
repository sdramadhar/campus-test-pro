# Dependency Risk Register

`npm audit` currently reports high-severity advisories in upstream-pinned toolchain packages:

- ESLint/Next lint chain through older `minimatch` and `brace-expansion`
- `@nestjs/swagger` pinning `js-yaml`
- Next canary pinning `postcss`

Safe root fixed versions are installed where possible. Forced audit fixes would downgrade or break core framework packages, so these are tracked as accepted build-time/toolchain risks until upstream packages publish compatible fixes.

Policy:

- `npm run security:audit` allows only the documented package names.
- Any new advisory outside the allowlist fails.
- Review this register before production deployment.
- Do not silently ignore runtime dependency advisories.
