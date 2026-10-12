import { createRouter } from "@hattip/router";
import { enhance, type RuntimeAdapterTarget, type UniversalMiddleware } from "@universal-middleware/core";
import { describe, expect, it, vi } from "vitest";

// Stands for the two halves of Vike's +middleware that vike(app) applies: the ones that aren't handlers, looked up upon each request and run in one loop with the app's middlewares, and the handlers with the pages. Here: the user's
// +middleware puts the `x-user` header in the context, after `x-delay` milliseconds, with an `x-step` header it also adds a response step that sets `x-step` on the response,
// and with an `x-answer` header it answers itself
vi.mock("vike/__internal", async () => {
  const { enhance, getUniversal, getUniversalProp, ...core } = await import("@universal-middleware/core");
  const plusMiddleware = enhance(
    async (request: Request, context: Universal.Context) => {
      await new Promise((resolve) => setTimeout(resolve, Number(request.headers.get("x-delay") ?? 0)));
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
    const order = getUniversalProp(middleware, core.orderSymbol);
    return typeof order === "number" ? order === 0 : Boolean(getUniversalProp(middleware, core.pathSymbol));
  };
  return {
    // Like the real one: one loop over the +middleware and the app's middlewares that aren't handlers, by order, the
    // +middleware first at equal order. The first Response answers, the app's middlewares after it still run, and the
    // response steps apply to the answer, or to the route or page.
    middlewaresPipe_nonHandlers: (middlewares: UniversalMiddleware[] = []) => {
      const nonHandlers = [plusMiddleware, ...middlewares.filter((middleware) => !isHandler(middleware))].sort(
        (a, b) => getUniversalProp(a, core.orderSymbol, 0) - getUniversalProp(b, core.orderSymbol, 0),
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
    },
    // The app's handlers, then stands for the +middleware that are handlers (here /x) and Vike's pages: like the real one, it declares every method and answers 404 for a method the pages don't declare
    middlewaresPipe_handlers: (middlewares: UniversalMiddleware[] = []) => {
      const handlersApp = core.pipeRoute(middlewares.filter(isHandler));
      return enhance(
        async (request: Request, context: Universal.Context, runtime: RuntimeAdapterTarget<unknown>) => {
          const answer = await handlersApp(request, context, runtime);
          if (answer) return answer;
          const { pathname } = new URL(request.url);
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
    },
  };
});

import vike, { apply, getContext } from "./index.js";

describe("@vikejs/hattip", () => {
  it("vike is a function", () => {
    expect(vike).toBeTypeOf("function");
  });

  it("apply is a function", () => {
    expect(apply).toBeTypeOf("function");
  });

  const send = (
    handler: ReturnType<ReturnType<typeof createRouter>["buildHandler"]>,
    path: string,
    init?: RequestInit,
  ) => {
    const request = new Request(`http://localhost${path}`, init);
    // biome-ignore lint/suspicious/noExplicitAny: a minimal HatTip context
    return handler({ request, url: new URL(request.url), method: request.method } as any);
  };
  const user = (context: unknown) => (getContext(context as Parameters<typeof getContext>[0]) as { user: string }).user;

  it("runs the +middleware before a route registered after vike(app), and the route sees the context", async () => {
    const router = createRouter();
    vike(router);
    router.get("/api/me", (context) => Response.json({ user: user(context) }));

    const response = await send(router.buildHandler(), "/api/me", { headers: { "x-user": "alice" } });
    expect(await response?.json()).toEqual({ user: "alice" });
  });

  it("runs the +middleware before the middlewares passed to vike(app), which see its context", async () => {
    const router = createRouter();
    vike(router, [
      enhance((_request, context) => new Response(`user ${(context as { user?: string }).user}`), { name: "extra" }),
    ]);

    const response = await send(router.buildHandler(), "/", { headers: { "x-user": "alice" } });
    expect(await response?.text()).toBe("user alice");
  });

  it("applies the response step of a middleware passed to vike(app) to a response the +middleware returns", async () => {
    const appHeader = enhance(
      () => (response: Response) => {
        response.headers.set("x-app", "applied");
        return response;
      },
      { name: "app-header" },
    );
    const router = createRouter();
    vike(router, [appHeader]);

    const response = await send(router.buildHandler(), "/about", { headers: { "x-answer": "1" } });
    expect([await response?.text(), response?.headers.get("x-app")]).toEqual(["+middleware", "applied"]);
  });

  it("answers with a +middleware that is a handler where the app has no route", async () => {
    const router = createRouter();
    vike(router);
    expect(await (await send(router.buildHandler(), "/x"))?.text()).toBe("handler");
  });

  it("answers with the app's route when a +middleware that is a handler has the same path", async () => {
    const router = createRouter();
    vike(router);
    router.get("/x", () => new Response("app"));
    expect(await (await send(router.buildHandler(), "/x"))?.text()).toBe("app");
  });

  it("answers with a handler passed to vike(app) after the app's routes", async () => {
    const passed = enhance(() => new Response("passed"), { name: "passed", method: "GET", path: "/y/**" });
    const router = createRouter();
    vike(router, [passed]);
    router.get("/y/route", () => new Response("app"));
    const handler = router.buildHandler();
    expect(await (await send(handler, "/y/route"))?.text()).toBe("app");
    expect(await (await send(handler, "/y/other"))?.text()).toBe("passed");
  });

  it("applies the response step of the +middleware to the response of a route registered after vike(app), and of a page", async () => {
    const router = createRouter();
    vike(router);
    router.get("/api/me", () => new Response("api"));
    const handler = router.buildHandler();

    for (const path of ["/api/me", "/about"]) {
      expect((await send(handler, path, { headers: { "x-step": "1" } }))?.headers.get("x-step")).toBe("applied");
    }
    expect((await send(handler, "/api/me"))?.headers.get("x-step")).toBe(null);
  });

  it("keeps the context of concurrent requests apart", async () => {
    const router = createRouter();
    vike(router);
    router.get("/api/me", async (context) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(user(context));
    });

    const handler = router.buildHandler();
    const [slow, fast] = await Promise.all([
      send(handler, "/api/me", { headers: { "x-user": "slow", "x-delay": "30" } }),
      send(handler, "/api/me", { headers: { "x-user": "fast" } }),
    ]);
    expect([await slow?.text(), await fast?.text()]).toEqual(["slow", "fast"]);
  });

  it("renders a page after the app's routes", async () => {
    const router = createRouter();
    vike(router);
    router.get("/api/me", () => new Response("api"));

    expect(await (await send(router.buildHandler(), "/about"))?.text()).toBe("page /about");
  });

  it("answers with the app's route when a page has the same path", async () => {
    const router = createRouter();
    vike(router);
    router.get("/about", () => new Response("app"));

    expect(await (await send(router.buildHandler(), "/about"))?.text()).toBe("app");
  });

  it("hands a JSON body to a route registered after vike(app)", async () => {
    const router = createRouter();
    vike(router);
    router.post("/api/echo", async (context) => Response.json(await context.request.json()));

    const response = await send(router.buildHandler(), "/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(await response?.json()).toEqual({ a: 1 });
  });

  it("answers HEAD on a route registered after vike(app)", async () => {
    const router = createRouter();
    vike(router);
    // HatTip's router doesn't match HEAD to a `get` route, so the route answers every method
    router.use("/api/me", () => new Response("api"));

    const response = await send(router.buildHandler(), "/api/me", { method: "HEAD" });
    expect(response?.status).toBe(200);
  });

  it("answers Vike's 404 for DELETE, which Vike's pages don't declare", async () => {
    const router = createRouter();
    vike(router);

    const response = await send(router.buildHandler(), "/about", { method: "DELETE" });
    expect(response?.status).toBe(404);
    expect(await response?.text()).toBe("Not Found");
  });

  it("throws when vike(app) is called twice on the same app", () => {
    const router = createRouter();
    vike(router);
    expect(() => vike(router)).toThrow(/already called/);
  });
});
