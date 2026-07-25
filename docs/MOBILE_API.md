# Mobile API

Mobile-safe endpoints:

- `POST /api/v1/mobile/devices`
- `DELETE /api/v1/mobile/devices/:id`
- `POST /api/v1/mobile/push-tokens`
- `DELETE /api/v1/mobile/push-tokens/:id`
- `GET /api/v1/mobile/config`

Device sessions and push tokens are tenant/user scoped. Push token values are hashed before storage. Mobile payloads must avoid sensitive lock-screen content unless policy explicitly allows it.
