export default vike;
export * from "@universal-middleware/h3";

import { type App, apply, createHandler } from "@universal-middleware/h3";
import { getMiddlewaresPipe_handlers, getMiddlewaresPipe_nonHandlers } from "vike/__internal";

type EnhancedMiddlewareH3 = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();
const errMsgIntro = "[@vikejs/h3] Wrong installation:";

/**
 * Installs Vike's list of +middleware in the right order:
 * - Server middlewares that aren't handlers first, before the app's routes
 * - Handlers last, after the app's routes
 *
 * It also installs Vike's handler that renders pages.
 */
function vike(app: App, middlewares: EnhancedMiddlewareH3[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  installed.add(app);

  // h3 picks the most specific path and falls back to GET for HEAD, so an app's route on any path but /** answers before the pages, whenever it's registered
  const handlersPipe = createHandler(() => getMiddlewaresPipe_handlers(middlewares))();
  for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "CONNECT", "TRACE", "QUERY"] as const) {
    app.on(method, "/**", handlersPipe);
  }

  const nonHandlersPipe = getMiddlewaresPipe_nonHandlers(middlewares);
  return apply(app, [nonHandlersPipe]);
}
