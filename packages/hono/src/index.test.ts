import { enhance, type RuntimeAdapterTarget, type UniversalMiddleware } from "@universal-middleware/core";
import { type Handler, Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
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
    middlewaresProxy_nonHandlers: (middlewares: UniversalMiddleware[] = []) => {
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
    middlewaresProxy_handlers: (middlewares: UniversalMiddleware[] = []) => {
      const handlersApp = core.pipeRoute(middlewares.filter(isHandler));
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
    },
  };
});

import vike, { apply, getContext } from "./index.js";

describe("@vikejs/hono", () => {
  it("vike is a function", () => {
    expect(vike).toBeTypeOf("function");
  });

  it("apply is a function", () => {
    expect(apply).toBeTypeOf("function");
  });

  it("runs the +middleware before a route registered after vike(app), and the route sees the context", async () => {
    const app = new Hono();
    vike(app);
    app.get("/api/me", (c) => c.json({ user: (getContext(c as never) as { user: string }).user }));

    const response = await app.request("/api/me", { headers: { "x-user": "alice" } });
    expect(await response.json()).toEqual({ user: "alice" });
  });

  it("runs the +middleware before the middlewares passed to vike(app), which see its context", async () => {
    const app = new Hono();
    vike(app, [
      enhance((_request, context) => new Response(`user ${(context as { user?: string }).user}`), { name: "extra" }),
    ]);

    const response = await app.request("/", { headers: { "x-user": "alice" } });
    expect(await response.text()).toBe("user alice");
  });

  it("applies the response step of a middleware passed to vike(app) to a response the +middleware returns", async () => {
    const appHeader = enhance(
      () => (response: Response) => {
        response.headers.set("x-app", "applied");
        return response;
      },
      { name: "app-header" },
    );
    const app = new Hono();
    vike(app, [appHeader]);

    const response = await app.request("/about", { headers: { "x-answer": "1" } });
    expect([await response.text(), response.headers.get("x-app")]).toEqual(["+middleware", "applied"]);
  });

  it("answers with a +middleware that is a handler where the app has no route", async () => {
    const app = new Hono();
    vike(app);
    expect(await (await app.request("/x")).text()).toBe("handler");
  });

  it("answers with the app's route when a +middleware that is a handler has the same path", async () => {
    const app = new Hono();
    vike(app);
    app.get("/x", (c) => c.text("app"));
    expect(await (await app.request("/x")).text()).toBe("app");
  });

  it("answers with a handler passed to vike(app) after the app's routes", async () => {
    const passed = enhance(() => new Response("passed"), { name: "passed", method: "GET", path: "/y/**" });
    const app = new Hono();
    vike(app, [passed]);
    app.get("/y/route", (c) => c.text("app"));
    expect(await (await app.request("/y/route")).text()).toBe("app");
    expect(await (await app.request("/y/other")).text()).toBe("passed");
  });

  it("applies the response step of the +middleware to the response of a route registered after vike(app), and of a page", async () => {
    const app = new Hono();
    vike(app);
    app.get("/api/me", (c) => c.text("api"));

    for (const path of ["/api/me", "/about"]) {
      expect((await app.request(path, { headers: { "x-step": "1" } })).headers.get("x-step")).toBe("applied");
    }
    expect((await app.request("/api/me")).headers.get("x-step")).toBe(null);
  });

  it("keeps the context of concurrent requests apart", async () => {
    const app = new Hono();
    vike(app);
    app.get("/api/me", async (c) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return c.text((getContext(c as never) as { user: string }).user);
    });

    const [slow, fast] = await Promise.all([
      app.request("/api/me", { headers: { "x-user": "slow", "x-delay": "30" } }),
      app.request("/api/me", { headers: { "x-user": "fast" } }),
    ]);
    expect([await slow.text(), await fast.text()]).toEqual(["slow", "fast"]);
  });

  it("renders a page after the app's routes", async () => {
    const app = new Hono();
    vike(app);
    app.get("/api/me", (c) => c.text("api"));

    const response = await app.request("/about");
    expect(await response.text()).toBe("page /about");
  });

  it("answers with the app's route when a page has the same path", async () => {
    const app = new Hono();
    vike(app);
    app.get("/about", (c) => c.text("app"));

    expect(await (await app.request("/about")).text()).toBe("app");
  });

  it("answers Hono's own not-found when a matched route calls c.notFound()", async () => {
    const app = new Hono();
    vike(app);
    app.get("/user/:id", (c) => c.notFound());

    const response = await app.request("/user/1");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("404 Not Found");
  });

  it("renders a page when a middleware on the page's path passes the request on", async () => {
    const app = new Hono();
    vike(app);
    app.use("/about", (_c, next) => next());

    expect(await (await app.request("/about")).text()).toBe("page /about");
  });

  it("renders a page when a method-specific middleware on the page's path passes the request on", async () => {
    const app = new Hono();
    vike(app);
    app.get("/about", async (_c, next) => {
      await next();
    });

    expect(await (await app.request("/about")).text()).toBe("page /about");
  });

  it("answers with a +middleware that is a handler when a method-specific middleware on its path passes the request on", async () => {
    const app = new Hono();
    vike(app);
    app.get("/x", async (_c, next) => {
      await next();
    });

    expect(await (await app.request("/x")).text()).toBe("handler");
  });

  it("answers Hono's own not-found when a wildcard route calls c.notFound()", async () => {
    const app = new Hono();
    vike(app);
    app.get("/users/*", (c) => c.notFound());

    const response = await app.request("/users/missing");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("404 Not Found");
  });

  it.each([
    "use",
    "get",
  ] as const)("answers Hono's own not-found when a wildcard route registered before vike(app) calls c.notFound() with %s", async (method) => {
    const app = new Hono();
    const notFound: Handler = (c) => c.notFound();
    if (method === "use") app.use("/static/*", notFound);
    else app.get("/static/*", notFound);
    vike(app);

    const response = await app.request("/static/missing");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("404 Not Found");
  });

  it("doesn't reach a +middleware that is a handler past an auth middleware when a route registered before vike(app) calls c.notFound()", async () => {
    const auth = enhance(
      (request: Request) => (request.headers.has("x-deny") ? new Response("denied", { status: 401 }) : undefined),
      {
        name: "auth",
        order: -100,
      },
    );
    const app = new Hono();
    app.get("/x/*", (c) => c.notFound());
    vike(app, [auth]);

    const response = await app.request("/x", { headers: { "x-deny": "1" } });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("404 Not Found");
  });

  it("renders a page when a route registered before vike(app) passes the request on", async () => {
    const app = new Hono();
    app.get("/static/*", (_c, next) => next());
    vike(app);

    expect(await (await app.request("/static/missing.css")).text()).toBe("page /static/missing.css");
  });

  it("renders a page when a wildcard route such as serveStatic passes the request on", async () => {
    const app = new Hono();
    vike(app);
    app.get("/static/*", (_c, next) => next());

    expect(await (await app.request("/static/missing.css")).text()).toBe("page /static/missing.css");
  });

  it("hands a JSON body to a route registered after vike(app)", async () => {
    const app = new Hono();
    vike(app);
    app.post("/api/echo", async (c) => c.json(await c.req.json()));

    const response = await app.request("/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(await response.json()).toEqual({ a: 1 });
  });

  it("answers HEAD on a route registered after vike(app)", async () => {
    const app = new Hono();
    vike(app);
    app.get("/api/me", (c) => c.text("api"));

    expect((await app.request("/api/me", { method: "HEAD" })).status).toBe(200);
  });

  it("answers Hono's 404 when neither the routes nor Vike's handler answer", async () => {
    const app = new Hono();
    vike(app);

    const response = await app.request("/nothing");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("404 Not Found");
  });

  it("answers Vike's 404 for DELETE, which Vike's pages don't declare", async () => {
    const app = new Hono();
    vike(app);

    const response = await app.request("/about", { method: "DELETE" });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  describe("a route registered before vike(app)", () => {
    it.each([
      ["GET", (app: Hono) => app.get("/health", (c) => c.text("ok"))],
      ["POST", (app: Hono) => app.post("/submit", (c) => c.text("ok"))],
    ])("throws for a %s route", (_method, register) => {
      const app = new Hono();
      register(app);
      expect(() => vike(app)).toThrow(/Call vike\(app\) before registering the app's routes/);
    });

    it.each([
      ["a logger", (app: Hono) => app.use(logger(() => {}))],
      ["cors()", (app: Hono) => app.use(cors())],
      ["cors() on a path", (app: Hono) => app.use("/api/*", cors())],
      ["a preflight OPTIONS route", (app: Hono) => app.options("/health", (c) => c.body(null, 204))],
      ["a preflight OPTIONS route on a wildcard path", (app: Hono) => app.options("/*", (c) => c.body(null, 204))],
      ["a static file route on a wildcard path", (app: Hono) => app.get("/static/*", (_c, next) => next())],
      ["app.all on a wildcard path", (app: Hono) => app.all("/*", (_c, next) => next())],
    ])("does not throw for %s", (_name, register) => {
      const app = new Hono();
      register(app);
      expect(() => vike(app)).not.toThrow();
    });
  });

  it("throws when vike(app) is called twice on the same app", () => {
    const app = new Hono();
    vike(app);
    expect(() => vike(app)).toThrow(/already called/);
  });

  it("throws at the first request when the app is mounted with app.route(), which drops app.notFound()", async () => {
    const child = new Hono();
    vike(child);
    const parent = new Hono().route("/", child);
    parent.onError((error, c) => c.text(error.message, 500));

    const response = await parent.request("/about");
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/mounted with app\.route\(\)/);
  });

  it("throws at the first request when app.notFound() replaced the handler", async () => {
    const app = new Hono();
    vike(app);
    app.notFound((c) => c.text("mine", 404));
    app.onError((error, c) => c.text(error.message, 500));

    const response = await app.request("/about");
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/app\.notFound\(\) was called after vike\(app\)/);
  });
});
