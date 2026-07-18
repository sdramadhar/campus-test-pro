# Email

Email is routed through `EmailService`.

Supported provider modes:

- `console`: local development, marks delivery records as sent and logs sanitized metadata.
- `smtp`, `resend`, `sendgrid`, `ses`: provider-ready configuration; credentials must come from environment secrets.

Templates covered:

- Account invitation
- Password reset
- Assessment assignment
- Assessment reminder
- Submission receipt
- Result published
- Account deactivated

Emails must not include passwords, refresh tokens, full student answers, answer keys, or hidden test cases.
