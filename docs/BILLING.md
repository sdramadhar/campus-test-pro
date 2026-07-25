# Billing

Supported provider modes:

- `DISABLED`
- `MOCK`
- `STRIPE`
- `RAZORPAY`

Local and test environments may use `MOCK`. Production rejects `MOCK`. `DISABLED` keeps manual subscription administration available and preserves all exam workflows.

CampusTest Pro must not store raw card details. Checkout and portal pages are provider-hosted or provider-tokenized. Redirect success is informational; subscription activation must be confirmed through a verified webhook.
