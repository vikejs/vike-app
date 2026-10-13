import { enhance } from "@universal-middleware/core";
import { createApp, createRouter, eventHandler, lazyEventHandler, readBody, toWebHandler } from "h3";
import { describe, expect, it, vi } from "vitest";

vi.mock("vike/__internal", () => import("../../../test/vikeInternalStub.js"));

import vike, { apply, getContext } from "./index.js";

describe("@vikejs/h3", () => {
  it("vike is a function", () => {
    expect(vike).toBeTypeOf("function");
  });

  it("apply is a function", () => {
    expect(apply).toBeTypeOf("function");
  });

  const send = (app: ReturnType<typeof createApp>, path: string, init?: RequestInit) =>
    toWebHandler(app)(new Request(`http://localhost${path}`, init));
  const routerApp = (app: ReturnType<typeof createApp>) => {
    const router = createRouter();
    app.use(router);
    return router;
  };

  it("runs the +middleware before a route registered after vike(app), and the route sees the context", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/api/me",
      eventHandler((event) => ({ user: (getContext(event) as { user: string }).user })),
    );

    const response = await send(app, "/api/me", { headers: { "x-user": "alice" } });
    expect(await response.json()).toEqual({ user: "alice" });
  });

  it("runs the +middleware before the middlewares passed to vike(app), which see its context", async () => {
    const app = createApp();
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
    const app = createApp();
    vike(app, [appHeader]);

    const response = await send(app, "/about", { headers: { "x-answer": "1" } });
    expect([await response.text(), response.headers.get("x-app")]).toEqual(["+middleware", "applied"]);
  });

  it("answers 200 JSON from a route that returns an object, with the response step of the +middleware applied", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/api/me",
      eventHandler((event) => ({ user: (getContext(event) as { user: string }).user })),
    );

    const response = await send(app, "/api/me", { headers: { "x-user": "alice", "x-step": "1" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-step")).toBe("applied");
    expect(await response.json()).toEqual({ user: "alice" });
  });

  it("answers with a +middleware that is a handler where the app has no route", async () => {
    const app = createApp();
    vike(app);
    expect(await (await send(app, "/x")).text()).toBe("handler");
  });

  it("answers with the app's route when a +middleware that is a handler has the same path", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/x",
      eventHandler(() => "app"),
    );
    expect(await (await send(app, "/x")).text()).toBe("app");
  });

  it("answers with a handler passed to vike(app) after the app's routes", async () => {
    const passed = enhance(() => new Response("passed"), { name: "passed", method: "GET", path: "/y/**" });
    const app = createApp();
    vike(app, [passed]);
    routerApp(app).get(
      "/y/route",
      eventHandler(() => "app"),
    );
    expect(await (await send(app, "/y/route")).text()).toBe("app");
    expect(await (await send(app, "/y/other")).text()).toBe("passed");
  });

  it("applies the response step of the +middleware to the response of a route registered after vike(app), and of a page", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/api/me",
      eventHandler(() => "api"),
    );

    for (const path of ["/api/me", "/about"]) {
      expect((await send(app, path, { headers: { "x-step": "1" } })).headers.get("x-step")).toBe("applied");
    }
    expect((await send(app, "/api/me")).headers.get("x-step")).toBe(null);
  });

  it("keeps the context of concurrent requests apart", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/api/me",
      eventHandler(async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return (getContext(event) as { user: string }).user;
      }),
    );

    const [slow, fast] = await Promise.all([
      send(app, "/api/me", { headers: { "x-user": "slow", "x-delay": "30" } }),
      send(app, "/api/me", { headers: { "x-user": "fast" } }),
    ]);
    expect([await slow.text(), await fast.text()]).toEqual(["slow", "fast"]);
  });

  it("renders a page after the app's routes", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/api/me",
      eventHandler(() => "api"),
    );

    expect(await (await send(app, "/about")).text()).toBe("page /about");
  });

  it("answers with the app's route when a page has the same path", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).get(
      "/about",
      eventHandler(() => "app"),
    );

    expect(await (await send(app, "/about")).text()).toBe("app");
  });

  it("hands a JSON body to a route registered after vike(app)", async () => {
    const app = createApp();
    vike(app);
    routerApp(app).post(
      "/api/echo",
      eventHandler((event) => readBody(event)),
    );

    const response = await send(app, "/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(await response.json()).toEqual({ a: 1 });
  });

  it("answers HEAD on a route registered after vike(app)", async () => {
    const app = createApp();
    vike(app);
    // h3's router answers HEAD with 404 for a `get` route, so the route answers every method
    app.use(
      "/api/me",
      eventHandler(() => "api"),
    );

    const response = await send(app, "/api/me", { method: "HEAD" });
    expect(response.status).toBe(200);
  });

  it("appends the pages once, at the first request", async () => {
    const app = createApp();
    vike(app);
    const before = app.stack.length;

    await send(app, "/about");
    const after = app.stack.length;
    expect(after).toBeGreaterThan(before);
    await send(app, "/about");
    expect(app.stack.length).toBe(after);
  });

  it("answers Vike's 404 for DELETE, which Vike's pages don't declare", async () => {
    const app = createApp();
    vike(app);

    const response = await send(app, "/about", { method: "DELETE" });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("keeps the app's own onRequest", async () => {
    const onRequest = vi.fn();
    const app = createApp({ onRequest });
    vike(app);

    await send(app, "/about");
    await send(app, "/about");
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  describe("a route registered before vike(app)", () => {
    const router = () =>
      createRouter().get(
        "/health",
        eventHandler(() => "ok"),
      );

    it.each([
      ["a router", (app: ReturnType<typeof createApp>) => app.use(router())],
      ["a router on a path", (app: ReturnType<typeof createApp>) => app.use("/api", router().handler)],
      ["a nested app", (app: ReturnType<typeof createApp>) => app.use("/sub", createApp().handler)],
      [
        "a lazy handler",
        (app: ReturnType<typeof createApp>) =>
          app.use(
            "/lazy",
            lazyEventHandler(() => eventHandler(() => "ok")),
          ),
      ],
    ])("throws for %s", (_name, register) => {
      const app = createApp();
      register(app);
      expect(() => vike(app)).toThrow(/Call vike\(app\) before registering the app's routes/);
    });

    it("names the path the router was mounted on", () => {
      const app = createApp();
      app.use("/api", router().handler);
      expect(() => vike(app)).toThrow(/mounted on \/api first/);
    });

    it.each([
      ["a middleware", (app: ReturnType<typeof createApp>) => app.use(eventHandler(() => {}))],
      [
        "a middleware passed to apply()",
        (app: ReturnType<typeof createApp>) => apply(app, [enhance(() => {}, { name: "session" })]),
      ],
    ])("does not throw for %s", (_name, register) => {
      const app = createApp();
      register(app);
      expect(() => vike(app)).not.toThrow();
    });
  });

  it("throws when vike(app) is called twice on the same app", () => {
    const app = createApp();
    vike(app);
    expect(() => vike(app)).toThrow(/already called/);
  });
});
