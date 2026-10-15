# `vikejs/vike-server-adapters`

Server adapters integrating [Vike](https://vike.dev) with various server frameworks.

Docs: [vike.dev/server](https://vike.dev/server)

## Packages

| Framework | Npm package | Changelog | Source code |
|---|---|---|---|
| [Hono](https://hono.dev) | [`@vikejs/hono`](https://www.npmjs.com/package/@vikejs/hono) | [CHANGELOG.md](packages/hono/CHANGELOG.md) | [`packages/hono/`](packages/hono) |
| [Express](https://expressjs.com) | [`@vikejs/express`](https://www.npmjs.com/package/@vikejs/express) | [CHANGELOG.md](packages/express/CHANGELOG.md) | [`packages/express/`](packages/express) |
| [Fastify](https://fastify.dev) | [`@vikejs/fastify`](https://www.npmjs.com/package/@vikejs/fastify) | [CHANGELOG.md](packages/fastify/CHANGELOG.md) | [`packages/fastify/`](packages/fastify) |
| [H3](https://h3.dev) | [`@vikejs/h3`](https://www.npmjs.com/package/@vikejs/h3) | [CHANGELOG.md](packages/h3/CHANGELOG.md) | [`packages/h3/`](packages/h3) |
| [Elysia](https://elysiajs.com) | [`@vikejs/elysia`](https://www.npmjs.com/package/@vikejs/elysia) | [CHANGELOG.md](packages/elysia/CHANGELOG.md) | [`packages/elysia/`](packages/elysia) |
| [srvx](https://srvx.unjs.io) | [`@vikejs/srvx`](https://www.npmjs.com/package/@vikejs/srvx) | [CHANGELOG.md](packages/srvx/CHANGELOG.md) | [`packages/srvx/`](packages/srvx) |

## Sandwich approach

`vike(app)` puts the app's routes between Vike's +middleware:

1. The +middleware that aren't handlers run first, and the app's routes see the context they add.
2. The app's routes registered after `vike(app)` come next.
3. The +middleware that are handlers and Vike's page handler run last: they answer the requests no route answers.

Each server adapter tests the three layers (`packages/*/src/index.test.ts`).
