---
"@vikejs/express": minor
"@vikejs/hono": minor
"@vikejs/fastify": minor
"@vikejs/elysia": minor
"@vikejs/h3": minor
"@vikejs/srvx": minor
---

feat: `vike(app)` runs the server middlewares from Vike extension ([`+middleware`](https://vike.dev/middleware)) that aren't handlers before the user's routes; handlers run after them

BREAKING CHANGE:
 - Requires Vike 0.4.268 or above
 - `vike(app)` must be called first, before registering your routes
