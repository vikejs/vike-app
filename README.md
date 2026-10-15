# `vikejs/vike-server-adapters`

Server adapters integrating [Vike](https://vike.dev) with various server frameworks.

Docs: [vike.dev/server](https://vike.dev/server)

## Packages

| Package | Framework | Changelog |
|---|---|---|
| [`@vikejs/hono`](packages/hono) | [Hono](https://hono.dev) | [CHANGELOG.md](packages/hono/CHANGELOG.md) |
| [`@vikejs/express`](packages/express) | [Express](https://expressjs.com) | [CHANGELOG.md](packages/express/CHANGELOG.md) |
| [`@vikejs/fastify`](packages/fastify) | [Fastify](https://fastify.dev) | [CHANGELOG.md](packages/fastify/CHANGELOG.md) |
| [`@vikejs/h3`](packages/h3) | [H3](https://h3.dev) | [CHANGELOG.md](packages/h3/CHANGELOG.md) |
| [`@vikejs/elysia`](packages/elysia) | [Elysia](https://elysiajs.com) | [CHANGELOG.md](packages/elysia/CHANGELOG.md) |
| [`@vikejs/srvx`](packages/srvx) | [srvx](https://srvx.unjs.io) | [CHANGELOG.md](packages/srvx/CHANGELOG.md) |

## Sandwich approach

`vike(app)` puts the app's routes between Vike's +middleware:

1. The +middleware that aren't handlers run first, and the app's routes see the context they add.
2. The app's routes registered after `vike(app)` come next.
3. The +middleware that are handlers and Vike's page handler run last: they answer the requests no route answers.

Each server adapter tests the three layers (`packages/*/src/index.test.ts`).
