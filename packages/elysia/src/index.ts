export default vike;
export * from "@universal-middleware/elysia";

import { type App, apply } from "@universal-middleware/elysia";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

type EnhancedMiddlewareElysia = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();
const errMsgIntro = "[@vikejs/elysia] Wrong installation:";

/**
 * Installs Vike's list of +middleware in the right order:
 * - Server middlewares that aren't handlers first, before the app's routes
 * - Handlers last, after the app's routes
 *
 * It also installs Vike's handler that renders pages.
 */
function vike(app: App, middlewares: EnhancedMiddlewareElysia[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  assertNoRouteBefore(app);
  installed.add(app);
  // The handlers are one catch-all route: Elysia matches the routes the app registers after vike(app) first
  const nonHandlersPipe = middlewaresPipe_nonHandlers(middlewares);
  const handlersPipe = middlewaresPipe_handlers(middlewares);
  return apply(app, [nonHandlersPipe, handlersPipe]);
}

// Elysia hooks registered later don't reach the routes registered before them
function assertNoRouteBefore(app: App) {
  const route = app.routes.find(({ method, path }) => method !== "OPTIONS" && !path.includes("*"));
  if (route) {
    const errMsg =
      `${errMsgIntro} ${route.method} ${route.path} was registered before vike(app), but vike(app) should be called before registering the app's routes — see https://vike.dev/server` as const;
    throw new Error(errMsg);
  }
}
