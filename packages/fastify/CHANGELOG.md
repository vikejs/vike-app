## [0.4.1](https://github.com/vikejs/vike-server-adapters/compare/@vikejs/fastify@0.4.0...@vikejs/fastify@0.4.1) (2026-10-15)


### Bug Fixes

* link each package's CHANGELOG.md from its README ([#18](https://github.com/vikejs/vike-server-adapters/issues/18)) ([30c3dc7](https://github.com/vikejs/vike-server-adapters/commit/30c3dc78ebdd06ac2de9b632e1e5c86daf8b968c))



# @vikejs/fastify

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
* Requires Fastify `5.12.5` or above, the minimum version `@universal-middleware/core` 0.5 supports.



## [0.2.5](https://github.com/vikejs/vike-server-adapters/compare/c109117...8216b9f) (2026-06-19)


### Bug Fixes

* update `@universal-middleware/fastify` to `^0.5.26` and `srvx` to `^0.11.17` ([#7](https://github.com/vikejs/vike-server-adapters/issues/7)) ([0fd4a82](https://github.com/vikejs/vike-server-adapters/commit/0fd4a8274ec03c2af90a7125f809b10e9dee206f))



## [0.2.4](https://github.com/vikejs/vike-server-adapters/compare/aa22348...c109117) (2026-04-03)


### Reverts

* Revert "fix: deadlock with srvx ([#5](https://github.com/vikejs/vike-server-adapters/issues/5))" ([d51778d](https://github.com/vikejs/vike-server-adapters/commit/d51778d877ed19aba20e5b05b0ca2ff5c34952e9))



## [0.2.3](https://github.com/vikejs/vike-server-adapters/compare/a510378...aa22348) (2026-04-03)

Meant to revert "fix: deadlock with srvx" ([#5](https://github.com/vikejs/vike-server-adapters/issues/5)), but its published code still contains it: use 0.2.4 instead.



## [0.2.2](https://github.com/vikejs/vike-server-adapters/compare/a7bb32b...a510378) (2026-04-03)


### Bug Fixes

* avoid a deadlock with srvx in `toFetchHandler()` ([#5](https://github.com/vikejs/vike-server-adapters/issues/5)) ([0afad6f](https://github.com/vikejs/vike-server-adapters/commit/0afad6fa956276d3af6d6ee76234721d13020541))



## [0.2.1](https://github.com/vikejs/vike-server-adapters/compare/d80cb2e...a7bb32b) (2026-03-30)


### Features

* export `toFetchHandler()` (from `srvx/node`) to turn the app into a `fetch` handler ([#4](https://github.com/vikejs/vike-server-adapters/issues/4)) ([8f181ff](https://github.com/vikejs/vike-server-adapters/commit/8f181ff7b77d799c7aa450feb687eaed70e5f6b3))



# [0.2.0](https://github.com/vikejs/vike-server-adapters/compare/535421e...d80cb2e) (2026-03-23)


### Features

* replace `addVikeMiddleware()` with a default `vike()` export ([68d26e8](https://github.com/vikejs/vike-server-adapters/commit/68d26e87ec5747a140e76e667c213aec81468988))


### BREAKING CHANGES

* `addVikeMiddleware()` removed, use the default export `vike()` instead



# [0.1.0](https://github.com/vikejs/vike-server-adapters/tree/535421e) (2026-03-11)

Initial release
