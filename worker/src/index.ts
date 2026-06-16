// Worker: API (Hono) + scheduled handler (cron → push).
// Faza 1: konfiguracja VAPID, subskrypcje push, CRUD zadań, wysyłka push z crona.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { sendPush, sendToAll, type StoredSubscription } from "./push";

export interface Env {
  DB: D1Database;
  APP_TOKEN: string;
  VAPID_SUBJECT: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

const app = new Hono<{ Bindings: Env }>();

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

// Klucz publiczny VAPID dla frontu (potrzebny do subskrypcji push). Jawny, nie sekret.
app.get("/api/config", (c) => c.json({ vapidPublicKey: c.env.VAPID_PUBLIC_KEY }));

// --- Subskrypcje push ---
app.post("/api/subscribe", async (c) => {
  const body = await c.req.json<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>();
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "invalid subscription" }, 400);
  }
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
  ).bind(body.endpoint, body.keys.p256dh, body.keys.auth).run();
  return c.json({ ok: true });
});

// --- Zadania ---
app.get("/api/tasks", async (c) => {
  const res = await c.env.DB.prepare(
    "SELECT * FROM tasks ORDER BY (due_at IS NULL), due_at ASC, created_at ASC",
  ).all();
  return c.json(res.results ?? []);
});

app.post("/api/tasks", async (c) => {
  const body = await c.req.json<{ content?: string; due_at?: string | null; has_time?: boolean }>();
  const content = body.content?.trim();
  if (!content) return c.json({ error: "content required" }, 400);
  const dueAt = body.due_at ?? null;
  const hasTime = body.has_time === false ? 0 : 1;
  const row = await c.env.DB.prepare(
    "INSERT INTO tasks (content, due_at, has_time) VALUES (?, ?, ?) RETURNING *",
  ).bind(content, dueAt, hasTime).first();
  return c.json(row, 201);
});

app.patch("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{
    content?: string;
    due_at?: string | null;
    has_time?: boolean;
    status?: "open" | "done";
  }>();

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.content !== undefined) { sets.push("content = ?"); binds.push(body.content.trim()); }
  if (body.status !== undefined) { sets.push("status = ?"); binds.push(body.status); }
  if (body.has_time !== undefined) { sets.push("has_time = ?"); binds.push(body.has_time ? 1 : 0); }
  // Zmiana terminu „uzbraja" przypomnienie na nowo (reminded_at = NULL).
  if (body.due_at !== undefined) {
    sets.push("due_at = ?"); binds.push(body.due_at);
    sets.push("reminded_at = NULL");
  }
  if (sets.length === 0) return c.json({ error: "nothing to update" }, 400);

  sets.push("updated_at = ?"); binds.push(nowIso());
  binds.push(id);
  const row = await c.env.DB.prepare(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
  ).bind(...binds).first();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

app.delete("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// --- Dev: ręczny test wysyłki push do wszystkich subskrypcji (do spike'u). ---
app.post("/api/_dev/test-push", async (c) => {
  const result = await sendToAll(c.env, { title: "Test push", body: "Działa 🎉", tag: "test" });
  return c.json(result);
});

export default {
  fetch: app.fetch,

  // Cron co minutę: znajdź zadania do przypomnienia teraz, wyślij push, zaznacz reminded_at.
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = nowIso();
    const due = await env.DB.prepare(
      `SELECT id, content FROM tasks
       WHERE status = 'open' AND has_time = 1 AND reminded_at IS NULL
         AND due_at IS NOT NULL AND due_at <= ?`,
    ).bind(now).all<{ id: number; content: string }>();

    const tasks = due.results ?? [];
    if (tasks.length === 0) return;

    const subsRes = await env.DB.prepare(
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions",
    ).all<StoredSubscription>();
    const subs = subsRes.results ?? [];

    for (const task of tasks) {
      for (const sub of subs) {
        try {
          const status = await sendPush(env, sub, {
            title: "Przypomnienie",
            body: task.content,
            tag: `task-${task.id}`,
          });
          if (status === 404 || status === 410) {
            await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
          }
        } catch {
          // pojedyncza nieudana wysyłka nie blokuje reszty
        }
      }
      await env.DB.prepare("UPDATE tasks SET reminded_at = ? WHERE id = ?").bind(now, task.id).run();
    }
  },
};
