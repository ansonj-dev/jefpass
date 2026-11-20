// Bind Cloudflare runtime bindings before OpenNext dispatches the request.
// OpenNext's generated worker remains responsible for routing, SSR and assets.
import openNextWorker from "./.open-next/worker.js";

export default {
  fetch(request, env, ctx) {
    globalThis.__JEFPASS_D1__ = env.DB;
    return openNextWorker.fetch(request, env, ctx);
  },
};
