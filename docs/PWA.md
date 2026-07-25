# PWA

The web app includes a manifest, icon, service worker, update notification, and offline shell.

Safe cache policy:

- Cache app shell, login, pricing, public status, and offline page.
- Do not cache API responses.
- Do not cache answers, tokens, reports, review data, coding submissions, or proctoring evidence.
- Do not support offline high-stakes exam attempts in this phase.

Offline exam mode requires a separate secure design for identity, timing, tamper resistance, conflict resolution, and proctoring.
