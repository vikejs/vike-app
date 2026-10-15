---
"@vikejs/hono": minor
---

BREAKING CHANGE: a request throws if `app.notFound()` was called after `vike(app)`, or if the app `vike(app)` was called on is mounted with `app.route()`; call `vike(app)` on the app that serves the requests
