import { type App, apply, createHandler } from "@universal-middleware/hono";
import type { MiddlewareHandler } from "hono";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

export * from "@universal-middleware/hono";

type EnhancedMiddlewareHono = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();
const errMsgExplanation = "which breaks vike(app) (because vike(app) uses app.notFound() to mount Vike's server handlers)"
const errMsgIntro = '[@vikejs/hono] Wrong installation:'

/**
 * Install the `+middleware` that aren't handlers right away, and the handlers with Vike's pages and not-found page as `app.notFound()`, so that the routes
 * the app registers after `vike(app)` keep their precedence over pages.
 */
export default function vike(app: App, middlewares: EnhancedMiddlewareHono[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  assertNoRouteBefore(app);
  installed.add(app);

  renderPagesOnNotFound(app, middlewares);
  guardNotFound(app);

  return apply(app, [middlewaresPipe_nonHandlers(middlewares)]);
}

function assertNoRouteBefore(app: App) {
  const route = app.routes.find((route) => route.method !== "OPTIONS" && isAppRoute(route));
  if (route) {
    const errMsg = `${errMsgIntro} ${route.method} ${route.path} was registered before vike(app), but vike(app) should be called before registering the app's routes — see https://vike.dev/server` as const;
    throw new Error(errMsg);
  }
}

// `app.use()` registers `ALL`, so a `GET` or `POST` entry is a route the app wrote
function isAppRoute({ method, path }: { method: string; path: string }) {
  return method !== "ALL" && !path.includes("*");
}

// The contexts that went through the guard and whose routes haven't called `c.notFound()` since
const fallThrough = new WeakSet<object>();

function renderPagesOnNotFound(app: App, middlewares: EnhancedMiddlewareHono[]) {
  const pages = createHandler(() => middlewaresPipe_handlers(middlewares))();
  app.notFound(async (c) => {
    // Hono calls this both when the routes pass the request on and when a route calls `c.notFound()`, which is a 404,
    // including a route registered before vike(app), which ends the request before the guard
    if (!fallThrough.has(c)) return c.text("404 Not Found", 404);
    return ((await pages(c, async () => {})) as Response | undefined) ?? c.text("404 Not Found", 404);
  });
}

// Runs before the app's routes on every request
function guardNotFound(app: App) {
  let notFoundReplaced = false;
  const setNotFound = app.notFound;
  // Watches the app.notFound() calls made from now on, so it runs after renderPagesOnNotFound()
  app.notFound = (handler) => {
    notFoundReplaced = true;
    return setNotFound(handler);
  };
  const guard: MiddlewareHandler = async (c, next) => {
    // Throws at the first request, where the app is complete: calling app.notFound() later would hide the pages
    if (notFoundReplaced) {
      const errMsg = `${errMsgIntro} app.notFound() was called after vike(app), ${errMsgExplanation}. Use app.onError() or a route instead, or install Vike's server handlers manually: apply(app, globalContext.middlewares.filter((m) => m.isHandler))` as const;
      throw new Error(errMsg);
    }
    // app.route() copies the routes but not app.notFound(), so a parent app would answer its own 404 instead of the pages
    const route = c.req.matchedRoutes.find((route) => route.handler === guard);
    if (!route || !app.routes.includes(route)) {
      const errMsg = `${errMsgIntro} an app that vike(app) was called on was mounted with app.route(), ${errMsgExplanation}. Call vike(app) on the app that serves the requests, the parent, and not on the mounted app.` as const;
      throw new Error(errMsg);
    }
    fallThrough.add(c);
    const notFound = c.notFound;
    c.notFound = () => {
      fallThrough.delete(c);
      return notFound();
    };
    await next();
  };
  app.use(guard);
}
