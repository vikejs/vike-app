## [0.4.1](https://github.com/vikejs/vike-server-adapters/compare/@vikejs/hono@0.4.0...@vikejs/hono@0.4.1) (2026-10-15)


### Bug Fixes

* link each package's CHANGELOG.md from its README ([#18](https://github.com/vikejs/vike-server-adapters/issues/18)) ([30c3dc7](https://github.com/vikejs/vike-server-adapters/commit/30c3dc78ebdd06ac2de9b632e1e5c86daf8b968c))



# @vikejs/hono

# [0.4.0](https://github.com/vikejs/vike-server-adapters/compare/875539e...75ccee7) (2026-10-15)


### Bug Fixes

* `vike(app)` runs server middlewares from Vike extension ([`+middleware`](https://vike.dev/middleware)) that aren't handlers before the user's routes; handlers run after them ([#10](https://github.com/vikejs/vike-server-adapters/issues/10)) ([b85b21c](https://github.com/vikejs/vike-server-adapters/commit/b85b21c884b6f6707faefb713ecf3b7fc1368eda))


### BREAKING CHANGES

* Requires Vike `0.4.268` or above
* `vike(app)` must be called first, before registering your routes



# [0.3.0](https://github.com/vikejs/vike-server-adapters/compare/8216b9f...875539e) (2026-10-07)


### Features

* use the `@universal-middleware/*` adapters built on `@universal-middleware/core` 0.5 ([#11](https://github.com/vikejs/vike-server-adapters/issues/11)) ([f6d40d9](https://github.com/vikejs/vike-server-adapters/commit/f6d40d9af58255056d453d32536b79da865fa109))


### BREAKING CHANGES

* The `path` of middlewares passed to `vike(app, middlewares)`, or registered with the re-exported `apply()`, now follows the [rou3 v0.12+ (1.x) syntax](https://github.com/h3js/rou3/releases/tag/v0.12.0), aligned with URLPattern: `*` matches the rest of the path, `/` included (use `:name` to match a single segment).
* Requires Hono `4.13.13` or above, the minimum version `@universal-middleware/core` 0.5 supports.



## [0.2.1](https://github.com/vikejs/vike-server-adapters/compare/d80cb2e...8216b9f) (2026-06-19)

No user-facing changes (dev dependency updates).



# [0.2.0](https://github.com/vikejs/vike-server-adapters/compare/535421e...d80cb2e) (2026-03-23)


### Features

* replace `addVikeMiddleware()` with a default `vike()` export ([68d26e8](https://github.com/vikejs/vike-server-adapters/commit/68d26e87ec5747a140e76e667c213aec81468988))


### BREAKING CHANGES

* `addVikeMiddleware()` removed, use the default export `vike()` instead



# [0.1.0](https://github.com/vikejs/vike-server-adapters/tree/535421e) (2026-03-11)

Initial release
