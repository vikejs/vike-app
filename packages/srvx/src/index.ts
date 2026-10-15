export default vike;
export * from "@universal-middleware/srvx";

import { apply } from "@universal-middleware/srvx";
import { getMiddlewaresPipe_handlers, getMiddlewaresPipe_nonHandlers } from "vike/__internal";

type EnhancedMiddlewareSrvx = Parameters<typeof apply>[0][number];

/**
 * Returns the server's `fetch` handler, which runs Vike's list of +middleware in the right order:
 * - Server middlewares that aren't handlers first, before the routes in `middlewares`
 * - Handlers last, after the routes in `middlewares`
 *
 * It also runs Vike's handler that renders pages.
 */
function vike(middlewares: EnhancedMiddlewareSrvx[] = []) {
  const nonHandlersPipe = getMiddlewaresPipe_nonHandlers(middlewares);
  // Tries the routes in `middlewares` before Vike's handlers
  const handlersPipe = getMiddlewaresPipe_handlers(middlewares);
  return apply([nonHandlersPipe, handlersPipe]);
}
