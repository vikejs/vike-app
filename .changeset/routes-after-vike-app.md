---
"@vikejs/express": minor
"@vikejs/hono": minor
"@vikejs/elysia": minor
---

BREAKING CHANGE: `vike(app)` throws if a route such as `app.get('/api', …)` was registered before it; call `vike(app)` first, then register your routes
