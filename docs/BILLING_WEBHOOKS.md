# Billing Webhooks

Endpoint: `POST /api/v1/billing/webhooks/:provider`

Webhook events are stored in `BillingWebhookEvent` with provider, provider event ID, event type, payload hash, processing status, and sanitized summary. The handler is idempotent and stores replayed events without trusting the frontend.

Production providers require signature verification through `BILLING_WEBHOOK_SECRET`. Do not log raw sensitive provider payloads.
