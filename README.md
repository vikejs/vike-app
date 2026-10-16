# `vikejs/vike-server-adapters`

Server adapters ([`vike(app)`](https://vike.dev/vike(app))) integrating [Vike](https://vike.dev) with various server frameworks.

Docs:
- [Vike > Integration > `+server`](https://vike.dev/server)
- [Vike > API > `vike(app)`](https://vike.dev/vike(app))

<br/>

## Packages

| Framework | Npm package | Source code | Changelog |
|---|---|---|---|
| [Hono](https://hono.dev) | [`@vikejs/hono`](https://www.npmjs.com/package/@vikejs/hono) | [`packages/hono/`](packages/hono) | [CHANGELOG.md](packages/hono/CHANGELOG.md) |
| [Express](https://expressjs.com) | [`@vikejs/express`](https://www.npmjs.com/package/@vikejs/express) | [`packages/express/`](packages/express) | [CHANGELOG.md](packages/express/CHANGELOG.md) |
| [Fastify](https://fastify.dev) | [`@vikejs/fastify`](https://www.npmjs.com/package/@vikejs/fastify) | [`packages/fastify/`](packages/fastify) | [CHANGELOG.md](packages/fastify/CHANGELOG.md) |
| [H3](https://h3.dev) | [`@vikejs/h3`](https://www.npmjs.com/package/@vikejs/h3) | [`packages/h3/`](packages/h3) | [CHANGELOG.md](packages/h3/CHANGELOG.md) |
| [Elysia](https://elysiajs.com) | [`@vikejs/elysia`](https://www.npmjs.com/package/@vikejs/elysia) | [`packages/elysia/`](packages/elysia) | [CHANGELOG.md](packages/elysia/CHANGELOG.md) |
| [srvx](https://srvx.unjs.io) | [`@vikejs/srvx`](https://www.npmjs.com/package/@vikejs/srvx) | [`packages/srvx/`](packages/srvx) | [CHANGELOG.md](packages/srvx/CHANGELOG.md) |

<br/>

## Sandwich approach

[`vike(app)`](https://vike.dev/vike(app)) installs [Vike middlewares](https://vike.dev/globalContext#middlewares) following a "sandwich approach" — it places the user's routes between Vike middlewares:

1. Vike middlewares that aren't handlers run first — so that the user's routes see the context added by Vike middlewares.
2. The user's routes come next.
3. Vike middlewares that are handlers run last — they answer requests that the user's routes didn't answer.

> [!NOTE]
> See also: [Vike > API > `vike(app)`](https://vike.dev/vike(app))

> [!NOTE]
> Each server adapter has tests to verify it follows the sandwich approach (`packages/*/src/index.test.ts`).
