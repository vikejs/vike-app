export default vike;
export * from "@universal-middleware/express";
export { toFetchHandler };

import { type App, apply, connectToWeb, createHandler } from "@universal-middleware/express";
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

/**
 * Convert an Express app into a web `fetch` handler.
 *
 * `connectToWeb()` resolves to `undefined` when the request is passed through
 * without being handled (Connect's `next()`, or a middleware returning `false`).
 * A terminal `fetch` handler must always return a `Response`, so we fall back to
 * a `404` — mirroring the `nextOr404` convention of `@universal-middleware`'s own
 * handlers. This keeps the return type assignable to `Server['fetch']`.
 *
 * (`@vikejs/express` used to re-export srvx's `toFetchHandler`, but that one
 * deadlocks and doesn't work on Deno/Bun — see srvx#132.)
 */
function toFetchHandler(app: Parameters<typeof connectToWeb>[0]): (request: Request) => Promise<Response> {
  const handler = connectToWeb(app);
  return async (request) => (await handler(request)) ?? new Response(null, { status: 404 });
}

type EnhancedMiddlewareExpress = Parameters<typeof apply>[1][number];

// A Connect app mounted with app.use(), like Vite's dev middleware, also has a stack: its layers keep their mount path in `route`
type Layer = { route?: string | { path: unknown; methods: Record<string, boolean> }; handle?: { stack?: Layer[] } };

const installed = new WeakSet<App>();
const errMsgIntro = "[@vikejs/express] Wrong installation:";

/**
 * Installs Vike's list of +middleware in the right order:
 * - Server middlewares that aren't handlers first, before the app's routes
 * - Handlers last, after the app's routes
 *
 * It also installs Vike's handler that renders pages.
 */
function vike(app: App, middlewares: EnhancedMiddlewareExpress[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  assertNoRouteBefore(app);
  installed.add(app);

  appendPagesOnFirstRequest(app, middlewares);

  return apply(app, [middlewaresPipe_nonHandlers(middlewares)]);
}

function assertNoRouteBefore(app: App) {
  const route = findRouteBefore(routerStack(app) ?? []);
  if (route) {
    const errMsg =
      `${errMsgIntro} ${route.methods} ${route.path} was registered before vike(app), but vike(app) should be called before registering the app's routes — see https://vike.dev/server` as const;
    throw new Error(errMsg);
  }
}

// Only routes have a `layer.route` object, also inside mounted routers; `express.static` and `cors()` are middleware.
// `app.all()` is every method: Express 4 sets `_all`, Express 5 lists them all.
function findRouteBefore(stack: Layer[]): { methods: string; path: string } | undefined {
  for (const layer of stack) {
    if (typeof layer.route === "object") {
      const { path, methods } = layer.route;
      const names = Object.keys(methods).filter((method) => methods[method]);
      if (names.every((method) => method === "options")) continue;
      if (typeof path === "string" && path.includes("*")) continue;
      return {
        methods: names.includes("_all") || names.length > 5 ? "ALL" : names.join(",").toUpperCase(),
        path: String(path),
      };
    }
    if (layer.handle?.stack) {
      const route = findRouteBefore(layer.handle.stack);
      if (route) return route;
    }
  }
}

// Express 4 keeps the router in `_router`, created on first use; Express 5 in `router`
function routerStack(app: App): Layer[] | undefined {
  const express4 = "del" in app;
  const router = express4
    ? (app as { _router?: { stack: Layer[] } })._router
    : (app as { router: { stack: Layer[] } }).router;
  return router?.stack;
}

// The app is complete at the first request: a route registered after it sits behind the handlers
function appendPagesOnFirstRequest(app: App, middlewares: EnhancedMiddlewareExpress[]) {
  const handle = app.handle;
  app.handle = function (this: App, ...args: Parameters<App["handle"]>) {
    app.handle = handle;
    const pages = createHandler(() => middlewaresPipe_handlers(middlewares))();
    app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) =>
      pages(req as Parameters<typeof pages>[0], res, next),
    );
    return handle.apply(this, args);
  };
}
