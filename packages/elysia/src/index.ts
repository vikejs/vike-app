import { type App, apply } from "@universal-middleware/elysia";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

export * from "@universal-middleware/elysia";

type EnhancedMiddlewareElysia = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();

/**
 * Install the `+middleware` that aren't handlers right away, and the handlers with Vike's pages and not-found page as one catch-all route: Elysia matches the
 * routes the app registers after `vike(app)` first.
 */
export default function vike(app: App, middlewares: EnhancedMiddlewareElysia[] = []) {
  if (installed.has(app)) {
    throw new Error("[@vikejs/elysia] vike(app) was already called on this app: call it once.");
  }
  assertNoRouteBefore(app);
  installed.add(app);
  return apply(app, [middlewaresPipe_nonHandlers(middlewares), middlewaresPipe_handlers(middlewares)]);
}

// Elysia hooks registered later don't reach the routes registered before them
function assertNoRouteBefore(app: App) {
  const route = app.routes.find(({ method, path }) => method !== "OPTIONS" && !path.includes("*"));
  if (route) {
    throw new Error(
      `[@vikejs/elysia] Wrong installation: ${route.method} ${route.path} was registered before vike(app), but vike(app) should be called before registering the app's routes — see https://vike.dev/server`,
    );
  }
}
