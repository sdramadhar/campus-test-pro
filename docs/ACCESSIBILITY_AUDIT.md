# Accessibility Audit

## Current Coverage

- Route crawl coverage is provided by `npm run route:crawl`.
- Public smoke E2E coverage is provided by `npm run e2e` when the frontend is running.
- UI pages use semantic headings, forms, buttons, and protected shell navigation patterns.

## Required Before Launch

- Run automated accessibility checks against staging.
- Manually test keyboard navigation for login, dashboards, exam taking, proctoring consent, billing, support, and admin tables.
- Verify focus states, color contrast, error summaries, labels, and screen-reader names.
- Verify timer and proctoring notices do not depend on color alone.
