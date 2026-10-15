export default vike;
export * from "@universal-middleware/express";
export { toFetchHandler };

import { type App, apply, connectToWeb, createHandler } from "@universal-middleware/express";
import { getMiddlewaresPipe_handlers, getMiddlewaresPipe_nonHandlers } from "vike/__internal";

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

// The Express internals vike(app) reads, which `App` doesn't declare
type ExpressApp = App & {
  handle(...args: unknown[]): unknown;
  router?: { stack: Layer[] };
  _router?: { stack: Layer[] };
};

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
  assertNoRouteBefore(app as ExpressApp);
  installed.add(app);

  appendHandlersOnFirstRequest(app as ExpressApp, middlewares);

  const nonHandlersPipe = getMiddlewaresPipe_nonHandlers(middlewares);
  return apply(app, [nonHandlersPipe]);
}

function assertNoRouteBefore(app: ExpressApp) {
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
function routerStack(app: ExpressApp): Layer[] | undefined {
  const express4 = "del" in app;
  const router = express4 ? app._router : app.router;
  return router?.stack;
}

// The app is complete at the first request: a route registered after it sits behind the handlers
function appendHandlersOnFirstRequest(app: ExpressApp, middlewares: EnhancedMiddlewareExpress[]) {
  const handle = app.handle;
  app.handle = function (this: ExpressApp, ...args: unknown[]) {
    app.handle = handle;
    const handlersPipe = createHandler(() => getMiddlewaresPipe_handlers(middlewares))();
    app.use(handlersPipe);
    return handle.apply(this, args);
  };
}
