import { fileURLToPath } from "node:url";
import { enhance } from "@universal-middleware/core";
import { Elysia } from "elysia";
import { serve } from "srvx";
import { createDevMiddleware } from "vike/server";
import { afterAll, describe, expect, it } from "vitest";
import vike, { apply } from "./index.js";

// Vike's global context comes from this app: the tests drive its +middleware with request headers
const { viteServer } = await createDevMiddleware({
  root: fileURLToPath(new URL("../../../test/app", import.meta.url)),
});
afterAll(() => viteServer.close());

describe("@vikejs/elysia", () => {
  it("vike is a function", () => {
    expect(vike).toBeTypeOf("function");
  });

  it("apply is a function", () => {
    expect(apply).toBeTypeOf("function");
  });

  const send = (app: Elysia, path: string, init?: RequestInit) =>
    app.handle(new Request(`http://localhost${path}`, init));

  it("runs the +middleware before a route registered after vike(app), and the route sees the context", async () => {
    const app = new Elysia();
    vike(app);
    // @ts-expect-error getContext() is derived by the +middleware's plugin
    app.get("/api/me", ({ getContext }) => ({ user: getContext().user }));

    const response = await send(app, "/api/me", { headers: { "x-user": "alice" } });
    expect(await response.json()).toEqual({ user: "alice" });
  });

  it("runs the +middleware before the middlewares passed to vike(app), which see its context", async () => {
    const app = new Elysia();
    vike(app, [
      enhance((_request, context) => new Response(`user ${(context as { user?: string }).user}`), { name: "extra" }),
    ]);

    const response = await send(app, "/", { headers: { "x-user": "alice" } });
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
    const app = new Elysia();
    vike(app, [appHeader]);

    const response = await send(app, "/about", { headers: { "x-answer": "1" } });
    expect([await response.text(), response.headers.get("x-app")]).toEqual(["+middleware", "applied"]);
  });

  it("answers with a +middleware that is a handler where the app has no route", async () => {
    const app = new Elysia();
    vike(app);
    expect(await (await send(app, "/x")).text()).toBe("handler");
  });

  it("answers with the app's route when a +middleware that is a handler has the same path", async () => {
    const app = new Elysia();
    vike(app);
    app.get("/x", () => "app");
    expect(await (await send(app, "/x")).text()).toBe("app");
  });

  it("answers with a handler passed to vike(app) after the app's routes", async () => {
    const passed = enhance(() => new Response("passed"), { name: "passed", method: "GET", path: "/y/**" });
    const app = new Elysia();
    vike(app, [passed]);
    app.get("/y/route", () => "app");
    expect(await (await send(app, "/y/route")).text()).toBe("app");
    expect(await (await send(app, "/y/other")).text()).toBe("passed");
  });

  it("applies the response step of the +middleware to the response of a route registered after vike(app) that returns a plain value, and of a page", async () => {
    const app = new Elysia();
    vike(app);
    app.get("/api/me", () => ({ api: true }));

    const api = await send(app, "/api/me", { headers: { "x-step": "1" } });
    expect(api.headers.get("x-step")).toBe("applied");
    expect(await api.json()).toEqual({ api: true });
    expect((await send(app, "/about", { headers: { "x-step": "1" } })).headers.get("x-step")).toBe("applied");
    expect((await send(app, "/api/me")).headers.get("x-step")).toBe(null);
  });

  it("keeps the context of concurrent requests apart", async () => {
    const app = new Elysia();
    vike(app);
    // @ts-expect-error getContext() is derived by the +middleware's plugin
    app.get("/api/me", async ({ getContext }) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return getContext().user;
    });

    const [alice, bob] = await Promise.all([
      send(app, "/api/me", { headers: { "x-user": "alice", "x-meet": "1" } }),
      send(app, "/api/me", { headers: { "x-user": "bob", "x-meet": "1" } }),
    ]);
    expect([await alice.text(), await bob.text()]).toEqual(["alice", "bob"]);
  });

  it("renders a page after the app's routes", async () => {
    const app = new Elysia();
    vike(app);
    app.get("/api/me", () => "api");

    expect(await (await send(app, "/about")).text()).toContain("page /about");
  });

  it("answers with the app's route when a page has the same path", async () => {
    const app = new Elysia();
    vike(app);
    app.get("/about", () => "app");

    expect(await (await send(app, "/about")).text()).toBe("app");
  });

  // Over real HTTP, because an in-process `app.handle()` does not reproduce the empty body.
  it("hands a JSON body to a route registered after vike(app), over HTTP", async () => {
    const app = new Elysia();
    vike(app);
    app.post("/api/echo", ({ body }) => Response.json({ body }));

    const server = serve({ fetch: (request) => app.handle(request), port: 0, silent: true });
    try {
      await server.ready();
      const response = await fetch(new URL("/api/echo", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ a: 1 }),
      });
      expect(await response.json()).toEqual({ body: { a: 1 } });
    } finally {
      await server.close(true);
    }
  });

  it("answers HEAD on a route registered after vike(app)", async () => {
    const app = new Elysia();
    vike(app);
    app.get("/api/me", () => "api");

    const response = await send(app, "/api/me", { method: "HEAD" });
    expect(response.status).toBe(200);
  });

  it("answers Vike's 404 for DELETE, which Vike's pages don't declare", async () => {
    const app = new Elysia();
    vike(app);

    const response = await send(app, "/about", { method: "DELETE" });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  describe("a route registered before vike(app)", () => {
    it.each([
      ["GET", (app: Elysia) => app.get("/health", () => "ok")],
      ["POST", (app: Elysia) => app.post("/submit", () => "ok")],
      ["a route of a plugin", (app: Elysia) => app.use(new Elysia().get("/plugin", () => "ok"))],
    ])("throws for %s", (_name, register) => {
      const app = new Elysia();
      register(app);
      expect(() => vike(app)).toThrow(/Wrong installation: .+ before vike\(app\)/);
    });

    it("names the route", () => {
      const app = new Elysia();
      app.get("/health", () => "ok");
      expect(() => vike(app)).toThrow(/GET \/health was registered before vike\(app\)/);
    });

    it.each([
      ["a request hook", (app: Elysia) => app.onRequest(() => {})],
      ["a plugin without routes", (app: Elysia) => app.use(new Elysia().onRequest(() => {}))],
      ["a preflight OPTIONS route", (app: Elysia) => app.options("/health", () => new Response(null, { status: 204 }))],
      ["a static file route on a wildcard path", (app: Elysia) => app.get("/static/*", () => "file")],
      ["app.all on a wildcard path", (app: Elysia) => app.all("/*", () => "all")],
    ])("does not throw for %s", (_name, register) => {
      const app = new Elysia();
      register(app);
      expect(() => vike(app)).not.toThrow();
    });
  });

  it("throws when vike(app) is called twice on the same app", () => {
    const app = new Elysia();
    vike(app);
    expect(() => vike(app)).toThrow(/already called/);
  });
});
