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
  installed.add(app);
  // The +middleware that aren't handlers are a preHandler hook, which Fastify runs before every route, and the
  // handlers are one `/*` route, which Fastify's router matches last: the app's routes come in between, whatever
  // order they're registered in
  const nonHandlersPipe = middlewaresPipe_nonHandlers(middlewares);
  const handlersPipe = middlewaresPipe_handlers(middlewares);
  return apply(app, [nonHandlersPipe, handlersPipe]);
}
