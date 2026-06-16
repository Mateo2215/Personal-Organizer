// Worker: API (Hono) + scheduled handler (cron → push). Faza 0: szkielet + auth + health.

import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: D1Database;
  APP_TOKEN: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS — w dev front (vite) i Worker są na różnych portach.
app.use("/api/*", cors());

// Bramka: każdy endpoint /api/* wymaga nagłówka Authorization: Bearer <APP_TOKEN>.
app.use("/api/*", async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || token !== c.env.APP_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

export default {
  fetch: app.fetch,

  // Cron co minutę. Faza 1: wybór zadań „do przypomnienia teraz" + wysyłka Web Push.
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // TODO(Faza 1): SELECT zadań (status=open, has_time=1, reminded_at IS NULL, due_at <= now)
    //               → wyślij push → ustaw reminded_at.
  },
};
