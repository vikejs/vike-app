import { enhance } from "@universal-middleware/core";

// Holds each request that has an `x-meet` header until two of them have arrived
let waiting: (() => void)[] = [];
const meet = () =>
  new Promise<void>((resolve) => {
    waiting.push(resolve);
    if (waiting.length < 2) return;
    for (const release of waiting) release();
    waiting = [];
  });

export default [
  // Puts the `x-user` header in the context, once the other `x-meet` request has arrived; with an `x-step` header it
  // also adds a response step that sets `x-step` on the response, and with an `x-answer` header it answers itself
  enhance(
    async (request: Request, context: Universal.Context) => {
      if (request.headers.has("x-meet")) await meet();
      Object.assign(context, { user: request.headers.get("x-user") });
      if (request.headers.has("x-answer")) return new Response("+middleware");
      if (!request.headers.has("x-step")) return;
      return (response: Response) => {
        response.headers.set("x-step", "applied");
        return response;
      };
    },
    { name: "test:plus" },
  ),
  // A +middleware that is a handler
  enhance(() => new Response("handler"), { name: "test:handler", method: "GET", path: "/x" }),
];
