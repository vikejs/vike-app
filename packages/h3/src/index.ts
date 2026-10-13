import { type App, apply, createHandler } from "@universal-middleware/h3";
import { eventHandler } from "h3";
import { middlewaresPipe_handlers, middlewaresPipe_nonHandlers } from "vike/__internal";

export * from "@universal-middleware/h3";

type EnhancedMiddlewareH3 = Parameters<typeof apply>[1][number];

const installed = new WeakSet<App>();
const errMsgIntro = "[@vikejs/h3] Wrong installation:";

/**
 * Install the `+middleware` that aren't handlers right away, and the handlers with Vike's pages and not-found page when the first request arrives, so that the
 * routes the app registers after `vike(app)` keep their precedence over pages. A route registered after the first
 * request sits behind the pages.
 */
export default function vike(app: App, middlewares: EnhancedMiddlewareH3[] = []) {
  if (installed.has(app)) {
    const errMsg = `${errMsgIntro} vike(app) was already called on this app: call it once.` as const;
    throw new Error(errMsg);
  }
  assertNoRouteBefore(app);
  installed.add(app);

  appendPagesOnFirstRequest(app, middlewares);

  return apply(app, [middlewaresPipe_nonHandlers(middlewares)]);
}

function assertNoRouteBefore(app: App) {
  // h3 marks routers, nested apps and lazy handlers with `__resolve__`, and not a plain middleware
  const layer = app.stack.find((layer) => layer.handler.__resolve__);
  if (layer) {
    const errMsg =
      `${errMsgIntro} a router, a nested app or a lazy handler was mounted on ${layer.route} before vike(app), but vike(app) should be called before registering the app's routes — see https://vike.dev/server` as const;
    throw new Error(errMsg);
  }
}

function appendPagesOnFirstRequest(app: App, middlewares: EnhancedMiddlewareH3[]) {
  const onRequest = app.options.onRequest;
  app.options.onRequest = async (event) => {
    app.options.onRequest = onRequest;
    // Not apply(app, [middlewaresPipe_handlers(middlewares)]): it would set app.options.onBeforeResponse again, dropping one the app set after vike(app)
    const pages = createHandler(() => middlewaresPipe_handlers(middlewares))();
    app.use(eventHandler((event) => pages(event)));
    await onRequest?.(event);
  };
}
