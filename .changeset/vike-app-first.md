---
"@vikejs/express": minor
"@vikejs/hono": minor
"@vikejs/fastify": minor
"@vikejs/elysia": minor
"@vikejs/h3": minor
"@vikejs/srvx": minor
---

feat: `vike(app)` runs the `+middleware` that aren't handlers before the app's own routes; handlers run with the pages after them

`vike(app)` now installs the `+middleware` that aren't handlers right away (looked up on every request, so a `+middleware` you add, remove or edit in `vike dev` needs no restart) and arranges for the `+middleware` that are handlers (`order: 0`, or a `path` and no `order`, such as Telefunc's `/_telefunc`) and Vike's pages and not-found page to run after the routes the app registers later, so a route the app registers after `vike(app)` on the same path answers instead of them. Routes the app registers after `vike(app)` see what the `+middleware` put in the context and keep their precedence over pages. The signature is unchanged.

- Express: the pages are appended when the first request arrives; a route registered after the first request sits behind the pages.
- H3: the pages are the route `/**` for every method but HEAD, which h3 answers with the GET route. h3 picks the most specific path, so an app's route answers before the pages whenever it's registered, unless its path is `/**` too.
- Hono: the pages are `app.notFound()`; the adapter throws at the first request if `app.notFound()` was called after `vike(app)`, or if the app was mounted with `app.route()`, which doesn't carry `app.notFound()` over (call `vike(app)` on the parent).
- Express, Hono and Elysia: `vike(app)` throws if a route was registered before it (the `+middleware` would not run for it).
- Calling `vike(app)` twice on the same app throws.
- The middlewares passed as the second argument, `vike(app, [myMiddleware()])`, now run with the `+middleware` that aren't handlers, by `order`, the `+middleware` first at equal `order`. A handler among them runs after the app's routes, like a `+middleware` handler. Register your app's own middlewares, such as a session, before `vike(app)`.
- A middleware passed as the second argument, such as `compress()`, now also applies its response step to a response a `+middleware` returns (`@vikejs/srvx` already did).

`@vikejs/h3` now requires h3 v2: create the app with `new H3()` and register routes with `app.get()` and the like. A route's own `Set-Cookie` is now sent once, and a `+middleware` response function can remove a header the route set.

For more control, apply `globalContext.middlewares` yourself, see [vike.dev/middleware#manual-integration](https://vike.dev/middleware#manual-integration).

Requires Vike 0.4.268 or later, which ships `globalContext.middlewares` and, in `vike/__internal`, the `getMiddlewaresPipe_nonHandlers` and `getMiddlewaresPipe_handlers` that `vike(app)` applies. With an older Vike, the adapters fail when they are imported.
