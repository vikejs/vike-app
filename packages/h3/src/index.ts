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

  // h3 matches the most specific route first, so the app's routes answer before this catch-all, whenever they're registered
  const handlersPipe = createHandler(() => getMiddlewaresPipe_handlers(middlewares))();
  app.all("/**", handlersPipe);

  const nonHandlersPipe = getMiddlewaresPipe_nonHandlers(middlewares);
  return apply(app, [nonHandlersPipe]);
}
