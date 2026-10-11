import { type App, apply, createHandler } from "@universal-middleware/h3";
import { eventHandler } from "h3";
import { middlewaresProxy_handlers, middlewaresProxy_middlewares } from "vike/__internal";

export * from "@universal-middleware/h3";

type EnhancedMiddlewareH3 = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();

/**
 * Install the `+middleware` that aren't handlers right away, and the handlers with Vike's pages and not-found page when the first request arrives, so that the
 * routes the app registers after `vike(app)` keep their precedence over pages. A route registered after the first
 * request sits behind the pages.
 */
export default function vike(app: App, middlewares: EnhancedMiddlewareH3[] = []) {
  if (installed.has(app)) {
    throw new Error("[@vikejs/h3] vike(app) was already called on this app: call it once.");
  }
  assertNoRouteBefore(app);
  installed.add(app);

  const onRequest = app.options.onRequest;
  app.options.onRequest = async (event) => {
    app.options.onRequest = onRequest;
    // Not apply(app, [middlewaresProxy_handlers]): it would set app.options.onBeforeResponse again, dropping one the app set after vike(app)
    const pages = createHandler(() => middlewaresProxy_handlers)();
    app.use(eventHandler((event) => pages(event)));
    await onRequest?.(event);
  };

  return apply(app, middlewaresProxy_middlewares(middlewares));
}

function assertNoRouteBefore(app: App) {
  // h3 marks routers, nested apps and lazy handlers with `__resolve__`, and not a plain middleware
  const layer = app.stack.find((layer) => layer.handler.__resolve__);
  if (layer) {
    throw new Error(
      `[@vikejs/h3] Call vike(app) before registering the app's routes: a router, a nested app or a lazy handler was mounted on ${layer.route} first, so the +middleware would not run for its routes. ` +
        `To answer a route before the +middleware, install them yourself: apply(app, middlewares.filter((m) => !m.isHandler)) and apply(app, middlewares.filter((m) => m.isHandler)), with the middlewares of (await getGlobalContext()).middlewares.`,
    );
  }
}
