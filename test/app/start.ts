import { fileURLToPath } from "node:url";
import { createDevMiddleware } from "vike/server";
import { afterAll } from "vitest";

// Vike's global context comes from this app: the tests drive its +middleware with request headers
const { viteServer } = await createDevMiddleware({ root: fileURLToPath(new URL(".", import.meta.url)) });
afterAll(() => viteServer.close());
