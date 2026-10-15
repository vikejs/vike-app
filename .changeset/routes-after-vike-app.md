---
"@vikejs/express": minor
"@vikejs/hono": minor
"@vikejs/elysia": minor
---

BREAKING CHANGE: `vike(app)` throws if one of the app's routes was registered before it; call `vike(app)` before registering your routes
