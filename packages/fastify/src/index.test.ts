import { enhance, type RuntimeAdapterTarget, type UniversalMiddleware } from "@universal-middleware/core";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

// A test sets `beforeContextSet` to hold every request's +middleware until all of them have arrived
const hooks = vi.hoisted(() => ({ beforeContextSet: undefined as undefined | (() => Promise<void>) }));

// Stands for the two halves of Vike's +middleware that vike(app) applies: the ones that aren't handlers, looked up upon each request and run in one loop with the app's middlewares, and the handlers with the pages. Here: the user's
// +middleware puts the `x-user` header in the context, after `hooks.beforeContextSet`, with an `x-step` header it also adds a response step that sets `x-step` on the response,
// and with an `x-answer` header it answers itself
vi.mock("vike/__internal", async () => {
  const { enhance, getUniversal, getUniversalProp, ...core } = await import("@universal-middleware/core");
  const plusMiddleware = enhance(
    async (request: Request, context: Universal.Context) => {
      await hooks.beforeContextSet?.();
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

import vike, { apply, getContext, toFetchHandler } from "./index.js";

describe("@vikejs/fastify", () => {
  it("vike is a function", () => {
    expect(vike).toBeTypeOf("function");
  });

  it("apply is a function", () => {
    expect(apply).toBeTypeOf("function");
  });

  it("toFetchHandler is a function", () => {
    expect(toFetchHandler).toBeTypeOf("function");
  });

  const user = (request: Parameters<typeof getContext>[0]) => (getContext(request) as { user: string }).user;

  it("runs the +middleware before a route registered after vike(app), and the route sees the context", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/api/me", (request) => ({ user: user(request) }));

    const response = await app.inject({ url: "/api/me", headers: { "x-user": "alice" } });
    expect(response.json()).toEqual({ user: "alice" });
  });

  it("runs the +middleware before the middlewares passed to vike(app), which see its context", async () => {
    const app = Fastify();
    await vike(app, [
      enhance((_request, context) => new Response(`user ${(context as { user?: string }).user}`), { name: "extra" }),
    ]);

    const response = await app.inject({ url: "/", headers: { "x-user": "alice" } });
    expect(response.body).toBe("user alice");
  });

  it("applies the response step of a middleware passed to vike(app) to a response the +middleware returns", async () => {
    const appHeader = enhance(
      () => (response: Response) => {
        response.headers.set("x-app", "applied");
        return response;
      },
      { name: "app-header" },
    );
    const app = Fastify();
    await vike(app, [appHeader]);

    const response = await app.inject({ url: "/about", headers: { "x-answer": "1" } });
    expect([response.body, response.headers["x-app"]]).toEqual(["+middleware", "applied"]);
  });

  it("answers with a +middleware that is a handler where the app has no route", async () => {
    const app = Fastify();
    await vike(app);
    expect((await app.inject({ url: "/x" })).body).toBe("handler");
  });

  it("answers with the app's route when a +middleware that is a handler has the same path", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/x", () => "app");
    expect((await app.inject({ url: "/x" })).body).toBe("app");
  });

  it("answers with a handler passed to vike(app) after the app's routes", async () => {
    const passed = enhance(() => new Response("passed"), { name: "passed", method: "GET", path: "/y/**" });
    const app = Fastify();
    await vike(app, [passed]);
    app.get("/y/route", () => "app");
    expect((await app.inject({ url: "/y/route" })).body).toBe("app");
    expect((await app.inject({ url: "/y/other" })).body).toBe("passed");
  });

  it("applies the response step of the +middleware to the response of a route registered after vike(app), and of a page", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/api/me", () => "api");

    for (const url of ["/api/me", "/about"]) {
      expect((await app.inject({ url, headers: { "x-step": "1" } })).headers["x-step"]).toBe("applied");
    }
    expect((await app.inject({ url: "/api/me" })).headers["x-step"]).toBeUndefined();
  });

  it("renders a page after the app's routes", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/api/me", () => "api");

    expect((await app.inject({ url: "/about" })).body).toBe("page /about");
  });

  it("answers with the app's route when a page has the same path", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/about", () => "app");

    expect((await app.inject({ url: "/about" })).body).toBe("app");
  });

  it("answers Vike's 404 for DELETE, which Vike's pages don't declare, and the +middleware that aren't handlers run once", async () => {
    let runs = 0;
    const app = Fastify();
    await vike(app, [
      enhance(
        (_request, context) => {
          runs++;
          return context;
        },
        { name: "count" },
      ),
    ]);

    const response = await app.inject({ method: "DELETE", url: "/about" });
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Not Found");
    expect(runs).toBe(1);
  });

  it("hands a JSON body to a route registered after vike(app)", async () => {
    const app = Fastify();
    await vike(app);
    app.post("/api/echo", (request) => request.body);

    const response = await app.inject({ method: "POST", url: "/api/echo", payload: { a: 1 } });
    expect(response.json()).toEqual({ a: 1 });
  });

  it("answers HEAD on a route registered after vike(app)", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/api/me", () => "api");

    expect((await app.inject({ method: "HEAD", url: "/api/me" })).statusCode).toBe(200);
  });

  it("keeps a redirect and a 204 from a route registered after vike(app)", async () => {
    const app = Fastify();
    await vike(app);
    app.get("/old", (_request, reply) => reply.redirect("/new", 302));
    app.get("/empty", (_request, reply) => reply.code(204).send());

    const redirect = await app.inject({ url: "/old" });
    expect([redirect.statusCode, redirect.headers.location]).toEqual([302, "/new"]);
    expect((await app.inject({ url: "/empty" })).statusCode).toBe(204);
  });

  // A request reads the context after an await, while the other request's +middleware has already set its own. The
  // barriers make the two requests interleave every time, so the test fails if the context is shared between requests.
  it("keeps the context of concurrent requests apart", async () => {
    const meet = (count: number) => {
      let arrived = 0;
      let release: () => void;
      const met = new Promise<void>((resolve) => (release = resolve));
      return () => {
        if (++arrived === count) release();
        return met;
      };
    };
    const middlewaresDone = meet(2);
    const routesStarted = meet(2);
    hooks.beforeContextSet = middlewaresDone;
    try {
      const app = Fastify();
      await vike(app);
      app.get("/api/me", async (request) => {
        await routesStarted();
        return user(request);
      });

      const [alice, bob] = await Promise.all([
        app.inject({ url: "/api/me", headers: { "x-user": "alice" } }),
        app.inject({ url: "/api/me", headers: { "x-user": "bob" } }),
      ]);
      expect([alice.body, bob.body]).toEqual(["alice", "bob"]);
    } finally {
      hooks.beforeContextSet = undefined;
    }
  });

  it("throws when vike(app) is called twice on the same app", async () => {
    const app = Fastify();
    await vike(app);
    expect(() => vike(app)).toThrow(/already called/);
  });
});
