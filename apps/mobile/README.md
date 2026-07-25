# CampusTest Pro Mobile Foundation

This folder is a Phase 18 mobile foundation for a future Expo React Native app. It is intentionally not registered as an npm workspace package yet, so the existing web, API, worker, and code-runner builds remain stable.

Initial screens planned:

- Splash
- Login
- Dashboard
- Assigned assessments
- Results
- Notifications
- Profile
- Support

Security guidance:

- Do not hardcode API URLs; use environment-specific runtime configuration.
- Store mobile refresh tokens in platform secure storage only.
- Register device sessions through `POST /api/v1/mobile/devices`.
- Register push tokens through `POST /api/v1/mobile/push-tokens`.
- Do not implement camera, screen capture, or offline exam attempts until a dedicated security design is reviewed.
- Do not claim App Store or Play Store publication from this foundation.
