import { type App, apply } from "@universal-middleware/hattip";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

export * from "@universal-middleware/hattip";

type EnhancedMiddlewareHattip = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();
const errMsgIntro = "[@vikejs/hattip] Wrong installation:";

/**
 * Installs Vike's list of +middleware in the right order:
 * - Server middlewares that aren't handlers first, before the app's routes
 * - Handlers last, after the app's routes
 *
 * It also installs Vike's handler that renders pages.
 */
export default function vike(app: App, middlewares: EnhancedMiddlewareHattip[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  installed.add(app);

  appendPagesOnBuildHandler(app, middlewares);

  return apply(app, [middlewaresPipe_nonHandlers(middlewares)]);
}

// The router builds its handler once the app is complete
function appendPagesOnBuildHandler(app: App, middlewares: EnhancedMiddlewareHattip[]) {
  const buildHandler = app.buildHandler;
  app.buildHandler = function (this: App) {
    app.buildHandler = buildHandler;
    apply(app, [middlewaresPipe_handlers(middlewares)]);
    return buildHandler.call(this);
  };
}
