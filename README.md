# `vikejs/vike-server-adapters`

Server adapters integrating [Vike](https://vike.dev) with various server frameworks.

Docs: see [vike.dev/server](https://vike.dev/server)

## Packages

| Package | Framework |
|---|---|
| [`@vikejs/hono`](packages/hono) | [Hono](https://hono.dev) |
| [`@vikejs/express`](packages/express) | [Express](https://expressjs.com) |
| [`@vikejs/fastify`](packages/fastify) | [Fastify](https://fastify.dev) |
| [`@vikejs/h3`](packages/h3) | [H3](https://h3.unjs.io) |
| [`@vikejs/elysia`](packages/elysia) | [Elysia](https://elysiajs.com) |
| [`@vikejs/hattip`](packages/hattip) | [HatTip](https://github.com/hattipjs/hattip) |
| [`@vikejs/srvx`](packages/srvx) | [srvx](https://srvx.unjs.io) |

## Overview

Each package exposes a `vike()` helper that registers Vike's middleware on your server app. They also re-export the full [`@universal-middleware`](https://github.com/magne4000/universal-middleware) API for the corresponding framework.

## Sandwich approach

`vike(app)` puts the app's routes between Vike's +middleware:

1. The +middleware that aren't handlers run first, and the app's routes see the context they add.
2. The app's routes registered after `vike(app)` come next.
3. The +middleware that are handlers and Vike's page handler run last: they answer the requests no route answers.

| Adapter | Before the app's routes | After the app's routes |
|---|---|---|
| Hono | `app.use()` in `vike(app)` | `app.notFound()`, which Hono calls when no route answers |
| Express | `app.use()` in `vike(app)` | `app.use()` at the first request, once the app has all its routes |
| h3 | `app.use()` in `vike(app)` | `app.use()` at the first request, once the app has all its routes |
| HatTip | `router.use()` in `vike(app)` | `router.use()` when `router.buildHandler()` runs |
| Fastify | A `preHandler` hook, which Fastify runs before every route | One `/*` route, which Fastify's router matches after any more specific route, whatever the registration order |
| Elysia | An `onBeforeHandle` hook, which reaches the routes registered after it | One `/*` route, which Elysia matches after the app's routes |
| srvx | There is no app: the routes are the handlers passed to `vike(middlewares)` | Vike's handlers, after those routes, in the same `fetch` handler |

Each package's `src/index.test.ts` verifies the three layers, with Vike mocked by `test/vikeInternalStub.ts`:

- `runs the +middleware before a route registered after vike(app), and the route sees the context` (1 before 2)
- `answers with the app's route when a +middleware that is a handler has the same path` and `answers with the app's route when a page has the same path` (2 before 3)
- `answers with a +middleware that is a handler where the app has no route` and `renders a page after the app's routes` (3)

srvx's tests make the same checks, worded for the routes in `middlewares`. Express's tests also register a route after an `await`, which the first request still puts before the handlers.

## Contributing

```sh
pnpm install
pnpm build
```
