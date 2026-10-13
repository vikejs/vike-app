export default vike;
export * from "@universal-middleware/fastify";
export { toFetchHandler } from "srvx/node";

import { type App, apply } from "@universal-middleware/fastify";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

type EnhancedMiddlewareFastify = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();
const errMsgIntro = "[@vikejs/fastify] Wrong installation:";

/**
 * Installs Vike's list of +middleware in the right order:
 * - Server middlewares that aren't handlers first, before the app's routes
 * - Handlers last, after the app's routes
 *
 * It also installs Vike's handler that renders pages.
 */
function vike(app: App, middlewares: EnhancedMiddlewareFastify[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  // TODO/ai: add a comment explaining why this works (does it respect the sandwich approach? If yes, why does it?) — make sure every adapter gets a little explanation of how it works somewhere in the code
  installed.add(app);
  // The handlers are one catch-all route: Fastify matches the routes the app registers after vike(app) first
  const nonHandlersPipe = middlewaresPipe_nonHandlers(middlewares);
  const handlersPipe = middlewaresPipe_handlers(middlewares);
  return apply(app, [nonHandlersPipe, handlersPipe]);
}
