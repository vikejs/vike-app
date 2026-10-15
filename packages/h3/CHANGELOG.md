# @vikejs/h3

## 0.4.0

### Minor Changes

- `vike(app)` runs the server middlewares from Vike extensions ([`+middleware`](https://vike.dev/middleware)) that aren't handlers before your routes; handlers run after them ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Requires h3 `2.0.0` or above ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Requires Vike `0.4.268` or above ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- **BREAKING CHANGE:** Call `vike(app)` first, before registering your routes ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))
- Update `@universal-middleware/h3` to `^0.7.0`, built on `@universal-middleware/core` 0.7 ([#10](https://github.com/vikejs/vike-server-adapters/pull/10))

## 0.3.0

### Minor Changes

- Update `@universal-middleware/h3` to `^0.5.0`, built on `@universal-middleware/core` 0.5 ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))
- **BREAKING CHANGE:** The `path` of middlewares passed to `vike(app, middlewares)`, or registered with the re-exported `apply()`, follows the [rou3 v0.12+ (1.x) syntax](https://github.com/h3js/rou3/releases/tag/v0.12.0), aligned with URLPattern: `*` matches the rest of the path, `/` included (use `:name` to match a single segment) ([#11](https://github.com/vikejs/vike-server-adapters/pull/11))

## 0.2.1

### Patch Changes

- Update dev dependencies (no user-facing changes)

## 0.2.0

### Minor Changes

- **BREAKING CHANGE:** Replace the named export `addVikeMiddleware()` with the default export `vike()` ([68d26e8](https://github.com/vikejs/vike-server-adapters/commit/68d26e87ec5747a140e76e667c213aec81468988))

## 0.1.0

### Minor Changes

- Initial release
