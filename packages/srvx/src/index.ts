import { apply } from "@universal-middleware/srvx";
import { middlewaresProxy_handlers, middlewaresProxy_middlewares } from "vike/__internal";

export * from "@universal-middleware/srvx";

type EnhancedMiddlewareSrvx = Parameters<typeof apply>[0][number];

/**
 * The `fetch` handler of the server: the `+middleware` that aren't handlers, then `middlewares` (one with a negative `order` runs first), then the
 * `+middleware` that are handlers with Vike's pages and not-found page.
 */
export default function vike(middlewares: EnhancedMiddlewareSrvx[] = []) {
  return apply([middlewaresProxy_middlewares, ...middlewares, middlewaresProxy_handlers]);
}
