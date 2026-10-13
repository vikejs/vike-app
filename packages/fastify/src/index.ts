import { type App, apply } from "@universal-middleware/fastify";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

export * from "@universal-middleware/fastify";
export { toFetchHandler } from "srvx/node";

type EnhancedMiddlewareFastify = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();

/**
 * Install the `+middleware` that aren't handlers right away, and the handlers with Vike's pages and not-found page as one catch-all route: Fastify matches the
 * routes the app registers after `vike(app)` first.
 */
export default function vike(app: App, middlewares: EnhancedMiddlewareFastify[] = []) {
  if (installed.has(app)) {
    throw new Error("[@vikejs/fastify] vike(app) was already called on this app: call it once.");
  }
  // TODO/ai: add a comment explaining why this works (does it respect the sandwich approach? If yes, why does it?) — make sure every adapter gets a little explanation of how it works somewhere in the code
  installed.add(app);
  return apply(app, [middlewaresPipe_nonHandlers(middlewares), middlewaresPipe_handlers(middlewares)]);
}
