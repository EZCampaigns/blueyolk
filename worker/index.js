// blueyolk.org Worker: serves the site files, and sends /api/treat to the video treatment container.
import { DurableObject } from "cloudflare:workers";

const IDLE_MS = 90 * 1000;              // stop the container after 90 idle seconds (saves money)
const TREAT_ON = false;                 // the public "instant treatment" is switched off (kept for later)
const MAX_BYTES = 30 * 1024 * 1024;     // 30 MB per clip, to keep costs down

export class Treat extends DurableObject {
  async ready() {
    const c = this.ctx.container;
    if (!c.running) c.start({ enableInternet: false });
    const port = c.getTcpPort(8080);
    for (let i = 0; i < 80; i++) {
      try { const r = await port.fetch("http://container/health"); if (r.ok) return port; } catch (e) {}
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("container not ready");
  }
  async fetch(request) {
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
    const port = await this.ready();
    const url = new URL(request.url);
    return port.fetch("http://container/treat" + url.search, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "Content-Length": request.headers.get("Content-Length") },
      body: request.body,
    });
  }
  async alarm() {
    if (this.ctx.container.running) await this.ctx.container.destroy();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/treat") {
      if (!TREAT_ON) return new Response("Not available.", { status: 404 });
      if (request.method !== "POST") return new Response("POST a video to this address.", { status: 405 });
      const len = Number(request.headers.get("Content-Length") || 0);
      if (!len || len > MAX_BYTES) return new Response("Clip too large.", { status: 413 });
      if (env.LIMIT) {
        const { success } = await env.LIMIT.limit({ key: request.headers.get("CF-Connecting-IP") || "anon" });
        if (!success) return new Response("Too many tries, wait a minute.", { status: 429 });
      }
      const mood = (url.searchParams.get("mood") || "none").replace(/[^a-z]/g, "").slice(0, 10);
      const stub = env.TREAT.get(env.TREAT.idFromName("pool-" + Math.floor(Math.random() * 2)));
      try {
        const r = await stub.fetch("https://treat/treat?mood=" + mood, { method: "POST", headers: { "Content-Length": String(len) }, body: request.body });
        const h = new Headers(r.headers); h.set("Cache-Control", "no-store");
        return new Response(r.body, { status: r.status, headers: h });
      } catch (e) {
        return new Response("Treatment is waking up, try again in a few seconds.", { status: 503 });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
