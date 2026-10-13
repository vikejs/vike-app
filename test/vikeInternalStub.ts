import {
  enhance,
  getUniversal,
  getUniversalProp,
  orderSymbol,
  pathSymbol,
  pipeRoute,
  type RuntimeAdapterTarget,
  type UniversalMiddleware,
} from "@universal-middleware/core";

// Stands for the two halves of Vike's +middleware that vike(app) applies: the ones that aren't handlers, looked up upon each request and run in one loop with the app's middlewares, and the handlers with the pages. Here: the user's
// +middleware puts the `x-user` header in the context, after `hooks.beforeContextSet` if a test set it, else after `x-delay` milliseconds, with an `x-step` header it also adds a response step that sets `x-step` on the response,
// and with an `x-answer` header it answers itself. Each package's tests mock "vike/__internal" with this module.

// A test sets `beforeContextSet` to hold every request's +middleware until all of them have arrived
export const hooks: { beforeContextSet: undefined | (() => Promise<void>) } = { beforeContextSet: undefined };

const plusMiddleware = enhance(
  async (request: Request, context: Universal.Context) => {
    if (hooks.beforeContextSet) await hooks.beforeContextSet();
    else await new Promise((resolve) => setTimeout(resolve, Number(request.headers.get("x-delay") ?? 0)));
    // Like the real one, it adds to the context and returns nothing, a response step or a Response
    Object.assign(context, { user: request.headers.get("x-user") });
    if (request.headers.has("x-answer")) return new Response("+middleware");
    if (!request.headers.has("x-step")) return;
    return (response: Response) => {
      response.headers.set("x-step", "applied");
      return response;
    };
  },
  { name: "stub:plus" },
);

// Like @universal-middleware/core's isHandler(), which its 0.6.0 doesn't export
const isHandler = (middleware: UniversalMiddleware) => {
  const order = getUniversalProp(middleware, orderSymbol);
  return typeof order === "number" ? order === 0 : Boolean(getUniversalProp(middleware, pathSymbol));
};

// Like the real one: one loop over the +middleware and the app's middlewares that aren't handlers, by order, the
// +middleware first at equal order. The first Response answers, the app's middlewares after it still run, and the
// response steps apply to the answer, or to the route or page.
export const middlewaresPipe_nonHandlers = (middlewares: UniversalMiddleware[] = []) => {
  const nonHandlers = [plusMiddleware, ...middlewares.filter((middleware) => !isHandler(middleware))].sort(
    (a, b) => getUniversalProp(a, orderSymbol, 0) - getUniversalProp(b, orderSymbol, 0),
  );
  return enhance(
    async (request: Request, context: Universal.Context, runtime: RuntimeAdapterTarget<unknown>) => {
      let answer: Response | undefined;
      const steps: ((response: Response) => Response | undefined | Promise<Response | undefined>)[] = [];
      for (const middleware of nonHandlers) {
        const result = await getUniversal(middleware)(request, context, runtime);
        if (result instanceof Response) answer ??= result;
        else if (typeof result === "function") steps.push(result);
      }
      const applySteps = async (response: Response) => {
        for (const step of steps) response = (await step(response)) ?? response;
        return response;
      };
      if (answer) return applySteps(answer);
      if (steps.length > 0) return applySteps;
    },
    { name: "stub:before" },
  );
};

// The app's handlers, then stands for the +middleware that are handlers (here /x) and Vike's pages: like the real one, it declares every method and answers 404 for a method the pages don't declare
export const middlewaresPipe_handlers = (middlewares: UniversalMiddleware[] = []) => {
  const handlersApp = pipeRoute(middlewares.filter(isHandler));
  return enhance(
    async (request: Request, context: Universal.Context, runtime: RuntimeAdapterTarget<unknown>) => {
      const answer = await handlersApp(request, context, runtime);
      if (answer) return answer;
      const { pathname } = new URL(request.url);
      // Vike's never does: stands for a handler that answers nothing
      if (pathname === "/nothing") return;
      if (!["GET", "POST", "PUT", "PATCH", "HEAD", "OPTIONS"].includes(request.method)) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response(request.method === "GET" && pathname === "/x" ? "handler" : `page ${pathname}`);
    },
    {
      name: "stub:after",
      method: ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "CONNECT", "TRACE"],
      path: "/**",
    },
  );
};
