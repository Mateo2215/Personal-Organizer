// Worker: API (Hono) + scheduled handler (cron → push).
// Faza 1: konfiguracja VAPID, subskrypcje push, CRUD zadań, wysyłka push z crona.
// Faza 3: CRUD projektów + pomysłów (usunięcie projektu → pomysły do Skrzynki).

import { Hono } from "hono";
import { cors } from "hono/cors";
import { sendPush, sendToAll, type StoredSubscription } from "./push";
import { notifySubscribers, processTaskReminders, reminderTitle } from "./scheduler";
import { EXPORT_FORMAT_VERSION, parseImport } from "./import";
import {
  BIRTHDAY_NOTIFY_HOUR,
  birthdayDayKeys,
  birthdayNotification,
  isValidMonthDay,
  localDateParts,
  readBirthYear,
  type BirthdayRow,
} from "./birthdays";

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
// Wyprzedzenie przypomnienia: dozwolone wyłącznie 0 (o terminie) / 15 / 30 / 60 min wcześniej.
const ALLOWED_OFFSETS = [0, 15, 30, 60];
// undefined → 0 (domyślne). Wartość spoza zestawu → null (handler zwraca 400).
function readOffset(value: unknown): number | null {
  if (value === undefined) return 0;
  return ALLOWED_OFFSETS.includes(value as number) ? (value as number) : null;
}

app.get("/api/tasks", async (c) => {
  const res = await c.env.DB.prepare(
    "SELECT * FROM tasks ORDER BY (due_at IS NULL), due_at ASC, created_at ASC",
  ).all();
  return c.json(res.results ?? []);
});

app.post("/api/tasks", async (c) => {
  const body = await c.req.json<{
    content?: string;
    due_at?: string | null;
    has_time?: boolean;
    reminder_offset_minutes?: number;
  }>();
  const content = body.content?.trim();
  if (!content) return c.json({ error: "content required" }, 400);
  const dueAt = body.due_at ?? null;
  const hasTime = body.has_time === false ? 0 : 1;
  const offset = readOffset(body.reminder_offset_minutes);
  if (offset === null) return c.json({ error: "invalid reminder offset" }, 400);
  // Wyprzedzenie ma sens tylko dla terminu z godziną — w przeciwnym razie wymuś 0.
  const effectiveOffset = dueAt !== null && hasTime === 1 ? offset : 0;
  const row = await c.env.DB.prepare(
    "INSERT INTO tasks (content, due_at, has_time, reminder_offset_minutes) VALUES (?, ?, ?, ?) RETURNING *",
  ).bind(content, dueAt, hasTime, effectiveOffset).first();
  return c.json(row, 201);
});

// Zbiorcze sprzątanie ukończonych zwykłych zadań. Rutyny żyją w osobnej tabeli i nie są dotykane.
// Trasa statyczna musi być zarejestrowana przed /api/tasks/:id.
app.delete("/api/tasks/completed", async (c) => {
  await c.env.DB.prepare("DELETE FROM tasks WHERE status = 'done'").run();
  return c.body(null, 204);
});

app.patch("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{
    content?: string;
    due_at?: string | null;
    has_time?: boolean;
    status?: "open" | "done";
    reminder_offset_minutes?: number;
  }>();

  const sets: string[] = [];
  const binds: unknown[] = [];
  // Zmiana terminu LUB wyprzedzenia „uzbraja" przypomnienie na nowo (reminded_at = NULL).
  let rearm = false;
  if (body.content !== undefined) { sets.push("content = ?"); binds.push(body.content.trim()); }
  if (body.status !== undefined) { sets.push("status = ?"); binds.push(body.status); }
  if (body.has_time !== undefined) { sets.push("has_time = ?"); binds.push(body.has_time ? 1 : 0); }
  if (body.due_at !== undefined) {
    sets.push("due_at = ?"); binds.push(body.due_at);
    rearm = true;
  }
  // Wyprzedzenie: waliduj zamknięty zestaw; usunięcie terminu (due_at = null) wymusza 0.
  if (body.reminder_offset_minutes !== undefined || body.due_at === null) {
    const offset = readOffset(body.reminder_offset_minutes);
    if (offset === null) return c.json({ error: "invalid reminder offset" }, 400);
    sets.push("reminder_offset_minutes = ?"); binds.push(body.due_at === null ? 0 : offset);
    rearm = true;
  }
  if (sets.length === 0) return c.json({ error: "nothing to update" }, 400);
  if (rearm) sets.push("reminded_at = NULL");

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

// --- Rutyny (codzienne zadania bez godziny i bez push; reset dzienny po stronie frontu) ---
app.get("/api/routines", async (c) => {
  const res = await c.env.DB.prepare(
    "SELECT * FROM routines ORDER BY created_at ASC, id ASC",
  ).all();
  return c.json(res.results ?? []);
});

app.post("/api/routines", async (c) => {
  const body = await c.req.json<{ content?: string }>();
  const content = body.content?.trim();
  if (!content) return c.json({ error: "content required" }, 400);
  const row = await c.env.DB.prepare(
    "INSERT INTO routines (content) VALUES (?) RETURNING *",
  ).bind(content).first();
  return c.json(row, 201);
});

// PATCH obsługuje rename (content) ORAZ odhaczenie/odznaczenie (last_done_on = data lokalna lub null).
app.patch("/api/routines/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ content?: string; last_done_on?: string | null }>();

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.content !== undefined) {
    const content = body.content.trim();
    if (!content) return c.json({ error: "content required" }, 400);
    sets.push("content = ?"); binds.push(content);
  }
  if (body.last_done_on !== undefined) { sets.push("last_done_on = ?"); binds.push(body.last_done_on ?? null); }
  if (sets.length === 0) return c.json({ error: "nothing to update" }, 400);

  binds.push(id);
  const row = await c.env.DB.prepare(
    `UPDATE routines SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
  ).bind(...binds).first();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

app.delete("/api/routines/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM routines WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// --- Projekty (grupują pomysły; zadania w v1 bez projektów) ---
app.get("/api/projects", async (c) => {
  const res = await c.env.DB.prepare(
    "SELECT * FROM projects ORDER BY name COLLATE NOCASE ASC",
  ).all();
  return c.json(res.results ?? []);
});

app.post("/api/projects", async (c) => {
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const row = await c.env.DB.prepare(
    "INSERT INTO projects (name) VALUES (?) RETURNING *",
  ).bind(name).first();
  return c.json(row, 201);
});

app.patch("/api/projects/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const row = await c.env.DB.prepare(
    "UPDATE projects SET name = ? WHERE id = ? RETURNING *",
  ).bind(name, id).first();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

// Usunięcie projektu przenosi jego pomysły do Skrzynki (project_id = NULL), nie kasuje ich. Atomowo.
app.delete("/api/projects/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE ideas SET project_id = NULL WHERE project_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id),
  ]);
  return c.body(null, 204);
});

// --- Pomysły (treść + automatyczny czas + opcjonalny projekt; NULL = Skrzynka) ---
app.get("/api/ideas", async (c) => {
  const res = await c.env.DB.prepare(
    "SELECT * FROM ideas ORDER BY created_at DESC, id DESC",
  ).all();
  return c.json(res.results ?? []);
});

// Priorytet pomysłu: 0 (bez) | 1 (niski) | 2 (średni) | 3 (wysoki). Cokolwiek poza tym → 0.
const clampPriority = (v: unknown): number => (v === 1 || v === 2 || v === 3 ? v : 0);

// Czy projekt o danym id istnieje? Strzeże przed osieroconym (niewidocznym) pomysłem z nieznanym project_id.
async function projectExists(db: D1Database, id: number): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM projects WHERE id = ?").bind(id).first();
  return row !== null;
}

app.post("/api/ideas", async (c) => {
  const body = await c.req.json<{ content?: string; project_id?: number | null; priority?: number }>();
  const content = body.content?.trim();
  if (!content) return c.json({ error: "content required" }, 400);
  const projectId = body.project_id ?? null;
  if (projectId !== null && !(await projectExists(c.env.DB, projectId))) {
    return c.json({ error: "project not found" }, 400);
  }
  const priority = clampPriority(body.priority);
  const row = await c.env.DB.prepare(
    "INSERT INTO ideas (content, project_id, priority) VALUES (?, ?, ?) RETURNING *",
  ).bind(content, projectId, priority).first();
  return c.json(row, 201);
});

app.patch("/api/ideas/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ content?: string; project_id?: number | null; priority?: number }>();

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.content !== undefined) {
    const content = body.content.trim();
    if (!content) return c.json({ error: "content required" }, 400);
    sets.push("content = ?"); binds.push(content);
  }
  if (body.project_id !== undefined) {
    const pid = body.project_id ?? null;
    if (pid !== null && !(await projectExists(c.env.DB, pid))) {
      return c.json({ error: "project not found" }, 400);
    }
    sets.push("project_id = ?"); binds.push(pid);
  }
  if (body.priority !== undefined) { sets.push("priority = ?"); binds.push(clampPriority(body.priority)); }
  if (sets.length === 0) return c.json({ error: "nothing to update" }, 400);

  binds.push(id);
  const row = await c.env.DB.prepare(
    `UPDATE ideas SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
  ).bind(...binds).first();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

app.delete("/api/ideas/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM ideas WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// --- Urodziny (rocznica bez roku w kluczu; push o BIRTHDAY_NOTIFY_HOUR czasu lokalnego) ---
app.get("/api/birthdays", async (c) => {
  const res = await c.env.DB.prepare(
    "SELECT * FROM birthdays ORDER BY month ASC, day ASC, name COLLATE NOCASE ASC",
  ).all();
  return c.json(res.results ?? []);
});

app.post("/api/birthdays", async (c) => {
  const body = await c.req.json<{
    name?: string;
    month?: number;
    day?: number;
    birth_year?: number | null;
  }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name required" }, 400);
  if (!isValidMonthDay(body.month, body.day)) return c.json({ error: "invalid date" }, 400);
  const birthYear = readBirthYear(body.birth_year, localDateParts(new Date()).year);
  if (birthYear === "invalid") return c.json({ error: "invalid birth year" }, 400);

  const row = await c.env.DB.prepare(
    "INSERT INTO birthdays (name, month, day, birth_year) VALUES (?, ?, ?, ?) RETURNING *",
  ).bind(name, body.month, body.day, birthYear).first();
  return c.json(row, 201);
});

app.patch("/api/birthdays/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{
    name?: string;
    month?: number;
    day?: number;
    birth_year?: number | null;
  }>();

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return c.json({ error: "name required" }, 400);
    sets.push("name = ?"); binds.push(name);
  }
  // Miesiąc i dzień idą zawsze parą — połowy daty nie da się sensownie zwalidować.
  if (body.month !== undefined || body.day !== undefined) {
    if (!isValidMonthDay(body.month, body.day)) return c.json({ error: "invalid date" }, 400);
    sets.push("month = ?", "day = ?"); binds.push(body.month, body.day);
    // Poprawiona data "uzbraja" powiadomienie na nowo (wzorzec re-arm z zadań) — bez tego
    // korekta literówki w dacie zadziałałaby dopiero za rok.
    sets.push("last_notified_year = NULL");
  }
  if (body.birth_year !== undefined) {
    const birthYear = readBirthYear(body.birth_year, localDateParts(new Date()).year);
    if (birthYear === "invalid") return c.json({ error: "invalid birth year" }, 400);
    sets.push("birth_year = ?"); binds.push(birthYear);
  }
  if (sets.length === 0) return c.json({ error: "nothing to update" }, 400);

  binds.push(id);
  const row = await c.env.DB.prepare(
    `UPDATE birthdays SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
  ).bind(...binds).first();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

app.delete("/api/birthdays/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM birthdays WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// --- Eksport danych: wersjonowana kopia zadań, pomysłów, projektów i rutyn. ---
app.get("/api/export", async (c) => {
  const [tasksRes, ideasRes, projectsRes, routinesRes, birthdaysRes] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM tasks ORDER BY created_at ASC, id ASC").all(),
    c.env.DB.prepare("SELECT * FROM ideas ORDER BY created_at ASC, id ASC").all(),
    c.env.DB.prepare("SELECT * FROM projects ORDER BY name COLLATE NOCASE ASC").all(),
    c.env.DB.prepare("SELECT * FROM routines ORDER BY created_at ASC, id ASC").all(),
    c.env.DB.prepare("SELECT * FROM birthdays ORDER BY month ASC, day ASC, id ASC").all(),
  ]);
  return c.json({
    format_version: EXPORT_FORMAT_VERSION,
    tasks: tasksRes.results ?? [],
    ideas: ideasRes.results ?? [],
    projects: projectsRes.results ?? [],
    routines: routinesRes.results ?? [],
    birthdays: birthdaysRes.results ?? [],
  });
});

// --- Import danych: pełne odtworzenie z kopii, bez ruszania subskrypcji push. ---
app.post("/api/import", async (c) => {
  const parsed = parseImport(await c.req.text());
  if (!parsed.ok) {
    return c.json({ error: "invalid import", details: parsed.error }, 400);
  }

  const { tasks, ideas, projects, routines, birthdays } = parsed.data;
  try {
    const statements = [
      c.env.DB.prepare("DELETE FROM ideas"),
      c.env.DB.prepare("DELETE FROM routines"),
      c.env.DB.prepare("DELETE FROM tasks"),
      c.env.DB.prepare("DELETE FROM projects"),
      c.env.DB.prepare(`
        INSERT INTO projects (id, name, created_at)
        SELECT
          CAST(json_extract(value, '$.id') AS INTEGER),
          json_extract(value, '$.name'),
          json_extract(value, '$.created_at')
        FROM json_each(?)
      `).bind(JSON.stringify(projects)),
      c.env.DB.prepare(`
        INSERT INTO tasks (id, content, due_at, has_time, status, reminded_at, reminder_offset_minutes, created_at, updated_at)
        SELECT
          CAST(json_extract(value, '$.id') AS INTEGER),
          json_extract(value, '$.content'),
          json_extract(value, '$.due_at'),
          CAST(json_extract(value, '$.has_time') AS INTEGER),
          json_extract(value, '$.status'),
          json_extract(value, '$.reminded_at'),
          CAST(COALESCE(json_extract(value, '$.reminder_offset_minutes'), 0) AS INTEGER),
          json_extract(value, '$.created_at'),
          json_extract(value, '$.updated_at')
        FROM json_each(?)
      `).bind(JSON.stringify(tasks)),
      c.env.DB.prepare(`
        INSERT INTO routines (id, content, last_done_on, created_at)
        SELECT
          CAST(json_extract(value, '$.id') AS INTEGER),
          json_extract(value, '$.content'),
          json_extract(value, '$.last_done_on'),
          json_extract(value, '$.created_at')
        FROM json_each(?)
      `).bind(JSON.stringify(routines)),
      c.env.DB.prepare(`
        INSERT INTO ideas (id, content, project_id, priority, created_at)
        SELECT
          CAST(json_extract(value, '$.id') AS INTEGER),
          json_extract(value, '$.content'),
          CAST(json_extract(value, '$.project_id') AS INTEGER),
          CAST(json_extract(value, '$.priority') AS INTEGER),
          json_extract(value, '$.created_at')
        FROM json_each(?)
      `).bind(JSON.stringify(ideas)),
    ];

    // Urodziny ruszamy TYLKO wtedy, gdy kopia w ogóle o nich mówi. Kopia sprzed tej funkcji
    // (format_version < 2) nie zawiera klucza `birthdays` i nie może po cichu wyczyścić listy.
    if (birthdays !== null) {
      statements.push(
        c.env.DB.prepare("DELETE FROM birthdays"),
        c.env.DB.prepare(`
          INSERT INTO birthdays (id, name, month, day, birth_year, last_notified_year, created_at)
          SELECT
            CAST(json_extract(value, '$.id') AS INTEGER),
            json_extract(value, '$.name'),
            CAST(json_extract(value, '$.month') AS INTEGER),
            CAST(json_extract(value, '$.day') AS INTEGER),
            CAST(json_extract(value, '$.birth_year') AS INTEGER),
            CAST(json_extract(value, '$.last_notified_year') AS INTEGER),
            json_extract(value, '$.created_at')
          FROM json_each(?)
        `).bind(JSON.stringify(birthdays)),
      );
    }

    await c.env.DB.batch(statements);
  } catch (error) {
    console.error("[import] restore failed", error instanceof Error ? error.message : "unknown error");
    return c.json({ error: "import failed" }, 500);
  }

  return c.json({
    ok: true,
    imported: {
      tasks: tasks.length,
      ideas: ideas.length,
      projects: projects.length,
      routines: routines.length,
      // null = kopia nie zawierała urodzin, więc lista została nietknięta (nie „zero urodzin").
      birthdays: birthdays === null ? null : birthdays.length,
    },
  });
});

// --- Dev: ręczny test wysyłki push do wszystkich subskrypcji (do spike'u). ---
app.post("/api/_dev/test-push", async (c) => {
  const result = await sendToAll(c.env, { title: "Test push", body: "Działa 🎉", tag: "test" });
  return c.json(result);
});

async function loadSubscriptions(env: Env): Promise<StoredSubscription[]> {
  const res = await env.DB.prepare(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions",
  ).all<StoredSubscription>();
  return res.results ?? [];
}

function deleteSubscription(env: Env, subId: number): Promise<void> {
  return env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?")
    .bind(subId)
    .run()
    .then(() => undefined);
}

// Zadania: znajdź przypomnienia należne na teraz, wyślij push, zaznacz reminded_at.
async function runTaskReminders(env: Env): Promise<void> {
  const now = nowIso();
  // Zadanie należne, gdy moment przypomnienia (due_at minus wyprzedzenie) już nadszedł.
  const due = await env.DB.prepare(
    `SELECT id, content, reminder_offset_minutes FROM tasks
     WHERE status = 'open' AND has_time = 1 AND reminded_at IS NULL
       AND due_at IS NOT NULL
       AND unixepoch(due_at) - reminder_offset_minutes * 60 <= unixepoch(?)`,
  ).bind(now).all<{ id: number; content: string; reminder_offset_minutes: number }>();

  const tasks = due.results ?? [];
  if (tasks.length === 0) return;

  await processTaskReminders(tasks, await loadSubscriptions(env), {
    sendPush: (sub, task) =>
      sendPush(env, sub, {
        title: reminderTitle(task.reminder_offset_minutes),
        body: task.content,
        tag: `task-${task.id}`,
      }),
    setRemindedAt: (taskId) =>
      env.DB.prepare("UPDATE tasks SET reminded_at = ? WHERE id = ?")
        .bind(now, taskId)
        .run()
        .then(() => undefined),
    deleteSub: (subId) => deleteSubscription(env, subId),
  });
}

// Urodziny: raz w roku, od BIRTHDAY_NOTIFY_HOUR czasu LOKALNEGO (cron chodzi w UTC).
// Strzelamy przy dowolnym ticku po tej godzinie, dopóki last_notified_year nie dogoni roku —
// dzięki temu zgubiona minuta crona naprawia się sama przy następnym przebiegu.
async function runBirthdayNotifications(env: Env): Promise<void> {
  const today = localDateParts(new Date());
  // Przed godziną powiadomienia nie ma po co ruszać D1 — utrzymanie zostaje przy $0.
  if (today.hour < BIRTHDAY_NOTIFY_HOUR) return;

  const keys = birthdayDayKeys(today);
  const keyClause = keys.map(() => "(month = ? AND day = ?)").join(" OR ");
  const due = await env.DB.prepare(
    `SELECT id, name, month, day, birth_year FROM birthdays
     WHERE (last_notified_year IS NULL OR last_notified_year < ?)
       AND (${keyClause})`,
  ).bind(today.year, ...keys.flatMap((key) => [key.month, key.day])).all<BirthdayRow>();

  const birthdays = due.results ?? [];
  if (birthdays.length === 0) return;

  await notifySubscribers(birthdays, await loadSubscriptions(env), {
    sendPush: (sub, birthday) =>
      sendPush(env, sub, {
        ...birthdayNotification(birthday, today.year),
        tag: `birthday-${birthday.id}`,
      }),
    markSent: (birthday) =>
      env.DB.prepare("UPDATE birthdays SET last_notified_year = ? WHERE id = ?")
        .bind(today.year, birthday.id)
        .run()
        .then(() => undefined),
    deleteSub: (subId) => deleteSubscription(env, subId),
  }, "birthday");
}

export default {
  fetch: app.fetch,

  // Cron co minutę: przypomnienia o zadaniach + urodziny.
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Każdy blok w osobnym try — awaria przypomnień nie może zabrać ze sobą urodzin (i odwrotnie).
    try {
      await runTaskReminders(env);
    } catch (err) {
      console.error("[cron] task reminders failed:", err instanceof Error ? err.message : String(err));
    }
    try {
      await runBirthdayNotifications(env);
    } catch (err) {
      console.error("[cron] birthdays failed:", err instanceof Error ? err.message : String(err));
    }
  },
};
