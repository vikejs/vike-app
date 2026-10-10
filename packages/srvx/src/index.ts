import { apply } from "@universal-middleware/srvx";
import { middlewaresProxy_handlers, middlewaresProxy_middlewares } from "vike/__internal";

export * from "@universal-middleware/srvx";

type EnhancedMiddlewareSrvx = Parameters<typeof apply>[0][number];

/**
 * The `fetch` handler of the server: the `+middleware` that aren't handlers, then the routes in `middlewares`, then the handlers with Vike's pages and
 * not-found page.
 */
export default function vike(middlewares: EnhancedMiddlewareSrvx[] = []) {
  return apply([...middlewares, middlewaresProxy_middlewares, middlewaresProxy_handlers]);
}
