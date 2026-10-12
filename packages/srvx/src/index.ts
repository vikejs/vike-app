import { apply } from "@universal-middleware/srvx";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

export * from "@universal-middleware/srvx";

type EnhancedMiddlewareSrvx = Parameters<typeof apply>[0][number];

/**
 * The `fetch` handler of the server: the `+middleware` and the middlewares in `middlewares` that aren't handlers, by `order` (the `+middleware` first at
 * equal `order`), then the routes in `middlewares`, then the `+middleware` that are handlers with Vike's pages and not-found page.
 */
export default function vike(middlewares: EnhancedMiddlewareSrvx[] = []) {
  return apply([middlewaresPipe_nonHandlers(middlewares), middlewaresPipe_handlers(middlewares)]);
}
