---
"@vikejs/express": minor
"@vikejs/hono": minor
"@vikejs/fastify": minor
"@vikejs/elysia": minor
"@vikejs/h3": minor
"@vikejs/srvx": minor
---

feat: `vike(app)` runs the `+middleware` that aren't handlers before the app's own routes; handlers run with the pages after them

- `vike(app)` throws if a route was registered before it (Express, Hono, Elysia) or if it's called twice on one app (every adapter but srvx). On Hono, it also throws if `app.notFound()` is called after it or the app is mounted with `app.route()`.
- Express: a route registered after the first request runs after the pages.
- The middlewares passed as `vike(app, [...])` now run with the `+middleware` that aren't handlers, so `compress()` also compresses a response a `+middleware` returns. They run after the `+middleware` at equal `order`: register a middleware a `+middleware` needs, such as a session, before `vike(app)` instead.
- `@vikejs/h3` now requires h3 v2.
- The re-exported `apply()` and `createMiddleware()` now come from the Universal Middleware adapters built on `@universal-middleware/core` 0.7, which changes the order `apply()` runs middlewares in, see [core 0.7.0's release notes](https://github.com/magne4000/universal-middleware/releases/tag/%40universal-middleware/core%400.7.0).
- Requires Vike 0.4.268 or later.
