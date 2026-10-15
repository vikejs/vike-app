# @vikejs/express

## 0.4.0

### Minor Changes

- `vike(app)` runs the server middlewares from Vike extensions ([`+middleware`](https://vike.dev/middleware)) that aren't handlers before your routes; handlers run after them ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Requires Vike `0.4.268` or above ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Call `vike(app)` first, before registering your routes ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- Update `@universal-middleware/express` to `^0.6.0`, built on `@universal-middleware/core` 0.7 ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))

## 0.3.0

### Minor Changes

- Update `@universal-middleware/express` to `^0.5.0`, built on `@universal-middleware/core` 0.5 ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))
- **BREAKING CHANGE:** The `path` of middlewares passed to `vike(app, middlewares)`, or registered with the re-exported `apply()`, follows the [rou3 v0.12+ (1.x) syntax](https://github.com/h3js/rou3/releases/tag/v0.12.0), aligned with URLPattern: `*` matches the rest of the path, `/` included (use `:name` to match a single segment) ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))

## 0.2.4

### Patch Changes

- `toFetchHandler()` always resolves to a `Response`, with a `404` when the app doesn't handle the request, instead of `undefined`: `fetch: toFetchHandler(app)` type-checks again ([#9](https://github.com/vikejs/vike-server-adapters/pull/9))

## 0.2.3

### Patch Changes

- `toFetchHandler()` propagates the request's cancel event to the app: it's now built on `connectToWeb()` from `@universal-middleware/express` instead of srvx's `toFetchHandler()`, and `srvx` is no longer a dependency ([#8](https://github.com/vikejs/vike-server-adapters/pull/8))
- Update `@universal-middleware/express` to `^0.4.30` ([#8](https://github.com/vikejs/vike-server-adapters/pull/8))

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
