# `vikejs/vike-server-adapters`

Server adapters integrating [Vike](https://vike.dev) with various server frameworks.

Docs: see [vike.dev/server](https://vike.dev/server)

## Packages

| Package | Framework | Changelog |
|---|---|---|
| [`@vikejs/hono`](packages/hono) | [Hono](https://hono.dev) | [CHANGELOG.md](packages/hono/CHANGELOG.md) |
| [`@vikejs/express`](packages/express) | [Express](https://expressjs.com) | [CHANGELOG.md](packages/express/CHANGELOG.md) |
| [`@vikejs/fastify`](packages/fastify) | [Fastify](https://fastify.dev) | [CHANGELOG.md](packages/fastify/CHANGELOG.md) |
| [`@vikejs/h3`](packages/h3) | [H3](https://h3.dev) | [CHANGELOG.md](packages/h3/CHANGELOG.md) |
| [`@vikejs/elysia`](packages/elysia) | [Elysia](https://elysiajs.com) | [CHANGELOG.md](packages/elysia/CHANGELOG.md) |
| [`@vikejs/srvx`](packages/srvx) | [srvx](https://srvx.unjs.io) | [CHANGELOG.md](packages/srvx/CHANGELOG.md) |

## Overview

Each package exposes a `vike()` helper that registers Vike's middleware on your server app. They also re-export the full [`@universal-middleware`](https://github.com/magne4000/universal-middleware) API for the corresponding framework.

## Sandwich approach

`vike(app)` puts the app's routes between Vike's +middleware:

1. The +middleware that aren't handlers run first, and the app's routes see the context they add.
2. The app's routes registered after `vike(app)` come next.
3. The +middleware that are handlers and Vike's page handler run last: they answer the requests no route answers.

Each server adapter tests the three layers (`packages/*/src/index.test.ts`).

## Contributing

```sh
pnpm install
pnpm build
```

### Commit messages

Each package's `CHANGELOG.md` is generated from the [Conventional Commits](https://www.conventionalcommits.org) (`fix:`, `feat:`, `perf:`, `BREAKING CHANGE:`) that modify the package's directory. A commit with a scope is included only if the scope is the full package name: use `fix: ...` or `fix(@vikejs/express): ...`, not `fix(express): ...`.

When a pull request is squash merged, its title becomes the commit message, so this also applies to pull request titles.

### Release

Each package is released on its own with [`@brillout/release-me`](https://github.com/brillout/release-me), from an up-to-date `main` branch:

```sh
cd packages/hono
pnpm run release         # patch: 0.4.0 => 0.4.1
pnpm run release:minor   # minor: 0.4.0 => 0.5.0 (also for breaking changes, while the version is 0.x)
pnpm run release:major   # major: 0.4.0 => 1.0.0
pnpm run release:commit  # pre-release: 0.4.0-commit-a1b2c3d, published right away
```

The other scripts preview the `CHANGELOG.md` and `package.json` changes and ask for confirmation, then build and publish the package, and push a release commit and a Git tag (e.g. `@vikejs/hono@0.4.1`).
