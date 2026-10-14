---
"@vikejs/express": minor
"@vikejs/hono": minor
"@vikejs/fastify": minor
"@vikejs/elysia": minor
"@vikejs/h3": minor
"@vikejs/srvx": minor
---

feat: `vike(app)` runs the `+middleware` that aren't handlers before the app's own routes; handlers run with the pages after them

`vike(app)` now runs the `+middleware` that aren't handlers before the routes the app registers after it, and the `+middleware` that are handlers and Vike's pages after them; those routes see the context the `+middleware` set. The signature is unchanged.

- Express: the pages are appended when the first request arrives; a route registered after the first request sits behind the pages.
- H3: the pages are the route `/**` for every method but HEAD, which h3 answers with the GET route. h3 picks the most specific path, so an app's route answers before the pages whenever it's registered, unless its path is `/**` too.
- Hono: the pages are `app.notFound()`; the adapter throws at the first request if `app.notFound()` was called after `vike(app)`, or if the app was mounted with `app.route()`, which doesn't carry `app.notFound()` over (call `vike(app)` on the parent).
- Express, Hono and Elysia: `vike(app)` throws if a route was registered before it (the `+middleware` would not run for it).
- Calling `vike(app)` twice on the same app throws.
- The middlewares passed as the second argument, `vike(app, [myMiddleware()])`, now run with the `+middleware` that aren't handlers, by `order`, the `+middleware` first at equal `order`. A handler among them runs after the app's routes, like a `+middleware` handler. Register your app's own middlewares, such as a session, before `vike(app)`.
- A middleware passed as the second argument, such as `compress()`, now also applies its response step to a response a `+middleware` returns (`@vikejs/srvx` already did).

`@vikejs/h3` now requires h3 v2: create the app with `new H3()` and register routes with `app.get()` and the like. A route's own `Set-Cookie` is now sent once, and a `+middleware` response function can remove a header the route set.

The re-exported `apply()` and `createMiddleware()` now come from the Universal Middleware adapters built on `@universal-middleware/core` 0.7. Their `apply()` changes the order middlewares run in, see [core 0.7.0's release notes](https://github.com/magne4000/universal-middleware/releases/tag/%40universal-middleware/core%400.7.0). For example, it runs a middleware with a positive `order` after the handler. On Hono and srvx, `createMiddleware()` now applies response functions in the order their middlewares are registered, no longer in reverse.

For more control, apply `globalContext.middlewares` yourself, see [vike.dev/vike(app)#manual-integration](https://vike.dev/vike(app)#manual-integration).

Requires Vike 0.4.268 or later, which ships `globalContext.middlewares` and, in `vike/__internal`, the `getMiddlewaresPipe_nonHandlers` and `getMiddlewaresPipe_handlers` that `vike(app)` applies. With an older Vike, the adapters fail when they are imported.
