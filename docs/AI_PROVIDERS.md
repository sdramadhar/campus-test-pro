# AI Providers

The AI layer is provider-agnostic.

Supported provider modes:

- `mock`: deterministic development/test provider.
- `openai`: reserved adapter slot.
- `gemini`: reserved adapter slot.
- `anthropic`: reserved adapter slot.

Environment variables:

- `AI_FEATURE_ENABLED`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_REQUEST_TIMEOUT_MS`
- `AI_MAX_RETRIES`
- `AI_DAILY_LIMIT`
- `AI_MONTHLY_LIMIT`
- `AI_MAX_QUESTIONS_PER_REQUEST`

External adapters fail closed until configured. The mock provider never represents real AI quality and is rejected in production.
