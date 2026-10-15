# @vikejs/fastify

## 0.4.0

### Minor Changes

- `vike(app)` runs the server middlewares from Vike extensions ([`+middleware`](https://vike.dev/middleware)) that aren't handlers before your routes; handlers run after them ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Requires Vike `0.4.268` or above ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Call `vike(app)` first, before registering your routes ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- Update `@universal-middleware/fastify` to `^0.7.0`, built on `@universal-middleware/core` 0.7 ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))

## 0.3.0

### Minor Changes

- Update `@universal-middleware/fastify` to `^0.6.0`, built on `@universal-middleware/core` 0.5 ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))
- **BREAKING CHANGE:** The `path` of middlewares passed to `vike(app, middlewares)`, or registered with the re-exported `apply()`, follows the [rou3 v0.12+ (1.x) syntax](https://github.com/h3js/rou3/releases/tag/v0.12.0), aligned with URLPattern: `*` matches the rest of the path, `/` included (use `:name` to match a single segment) ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))
- **BREAKING CHANGE:** Requires Fastify `5.12.5` or above, the minimum version `@universal-middleware/core` 0.5 supports ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))

## 0.2.5

### Patch Changes

- Update `@universal-middleware/fastify` to `^0.5.26` and `srvx` to `^0.11.17` ([#7](https://github.com/vikejs/vike-server-adapters/pull/7))

## 0.2.4

### Patch Changes

- Revert the `toFetchHandler()` change of 0.2.2: it's srvx's own `toFetchHandler()` again ([d51778d](https://github.com/vikejs/vike-server-adapters/commit/d51778d877ed19aba20e5b05b0ca2ff5c34952e9))

## 0.2.3

### Patch Changes

- Meant to revert the `toFetchHandler()` change of 0.2.2, but the published package still contains it: use 0.2.4 instead

## 0.2.2

### Patch Changes

- Avoid a deadlock with srvx in `toFetchHandler()`, and update `srvx` to `^0.11.15` ([#5](https://github.com/vikejs/vike-server-adapters/pull/5))

## 0.2.1

### Patch Changes

- Export srvx's `toFetchHandler()` (from `srvx/node`), to turn the app into a `fetch` handler ([#4](https://github.com/vikejs/vike-server-adapters/pull/4))

## 0.2.0

### Minor Changes

- **BREAKING CHANGE:** Replace the named export `addVikeMiddleware()` with the default export `vike()` ([68d26e8](https://github.com/vikejs/vike-server-adapters/commit/68d26e87ec5747a140e76e667c213aec81468988))

## 0.1.0

### Minor Changes

- Initial release
