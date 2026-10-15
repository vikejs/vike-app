import { enhance } from "@universal-middleware/core";
import { H3, readBody } from "h3";
import { describe, expect, it } from "vitest";
import vike, { apply, getContext } from "./index.js";
import "../../../test/app/start.js";

describe("@vikejs/h3", () => {
  it("vike is a function", () => {
    expect(vike).toBeTypeOf("function");
  });

  it("apply is a function", () => {
    expect(apply).toBeTypeOf("function");
  });

  const send = (app: H3, path: string, init?: RequestInit) => app.fetch(new Request(`http://localhost${path}`, init));

  it("runs the +middleware before a route registered after vike(app), and the route sees the context", async () => {
    const app = new H3();
    vike(app);
    app.get("/api/me", (event) => ({ user: (getContext(event) as { user: string }).user }));

    const response = await send(app, "/api/me", { headers: { "x-user": "alice" } });
    expect(await response.json()).toEqual({ user: "alice" });
  });

  it("runs the +middleware before the middlewares passed to vike(app), which see its context", async () => {
    const app = new H3();
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
    const app = new H3();
    vike(app, [appHeader]);

    const response = await send(app, "/about", { headers: { "x-answer": "1" } });
    expect([await response.text(), response.headers.get("x-app")]).toEqual(["+middleware", "applied"]);
  });

  it("answers with a +middleware that is a handler where the app has no route", async () => {
    const app = new H3();
    vike(app);
    expect(await (await send(app, "/x")).text()).toBe("handler");
  });

  it("answers with the app's route when a +middleware that is a handler has the same path", async () => {
    const app = new H3();
    vike(app);
    app.get("/x", () => "app");
    expect(await (await send(app, "/x")).text()).toBe("app");
  });

  it("answers with a handler passed to vike(app) after the app's routes", async () => {
    const passed = enhance(() => new Response("passed"), { name: "passed", method: "GET", path: "/y/**" });
    const app = new H3();
    vike(app, [passed]);
    app.get("/y/route", () => "app");
    expect(await (await send(app, "/y/route")).text()).toBe("app");
    expect(await (await send(app, "/y/other")).text()).toBe("passed");
  });

  it("applies the response step of the +middleware to the response of a route registered after vike(app), and of a page", async () => {
    const app = new H3();
    vike(app);
    app.get("/api/me", () => "api");

    for (const path of ["/api/me", "/about"]) {
      expect((await send(app, path, { headers: { "x-step": "1" } })).headers.get("x-step")).toBe("applied");
    }
    expect((await send(app, "/api/me")).headers.get("x-step")).toBe(null);
  });

  it("keeps the context of concurrent requests apart", async () => {
    const app = new H3();
    vike(app);
    app.get("/api/me", async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return (getContext(event) as { user: string }).user;
    });

    const [alice, bob] = await Promise.all([
      send(app, "/api/me", { headers: { "x-user": "alice", "x-meet": "1" } }),
      send(app, "/api/me", { headers: { "x-user": "bob", "x-meet": "1" } }),
    ]);
    expect([await alice.text(), await bob.text()]).toEqual(["alice", "bob"]);
  });

  it("renders a page after the app's routes", async () => {
    const app = new H3();
    vike(app);
    app.get("/api/me", () => "api");

    expect(await (await send(app, "/about")).text()).toContain("page /about");
  });

  it("answers with the app's route when a page has the same path", async () => {
    const app = new H3();
    vike(app);
    app.get("/about", () => "app");

    expect(await (await send(app, "/about")).text()).toBe("app");
  });

  it("hands a JSON body to a route registered after vike(app)", async () => {
    const app = new H3();
    vike(app);
    app.post("/api/echo", (event) => readBody(event));

    const response = await send(app, "/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(await response.json()).toEqual({ a: 1 });
  });

  it("answers HEAD on a route registered after vike(app)", async () => {
    const app = new H3();
    vike(app);
    app.get("/api/me", (event) => {
      event.res.headers.set("x-from", "app");
      return "api";
    });

    const response = await send(app, "/api/me", { method: "HEAD" });
    expect(response.headers.get("x-from")).toBe("app");
  });

  it("passes a DELETE to Vike, which answers 404", async () => {
    const app = new H3();
    vike(app);

    const response = await send(app, "/about", { method: "DELETE" });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("runs the +middleware before a route registered before vike(app)", async () => {
    const app = new H3();
    app.get("/api/me", (event) => (getContext(event) as { user: string }).user);
    vike(app);

    expect(await (await send(app, "/api/me", { headers: { "x-user": "alice" } })).text()).toBe("alice");
  });

  it("throws when vike(app) is called twice on the same app", () => {
    const app = new H3();
    vike(app);
    expect(() => vike(app)).toThrow(/already called/);
  });
});
