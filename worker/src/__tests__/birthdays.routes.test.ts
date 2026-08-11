// Testy HTTP tras urodzin: autoryzacja, walidacja daty i rocznika oraz re-arm po zmianie daty.

import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../index";

interface PreparedCall {
  sql: string;
  binds: unknown[];
}

function makeEnv(firstResult: unknown = { id: 1 }) {
  const calls: PreparedCall[] = [];
  const prepare = vi.fn((sql: string) => {
    const call: PreparedCall = { sql, binds: [] };
    calls.push(call);
    const statement = {
      bind: vi.fn((...binds: unknown[]) => {
        call.binds = binds;
        return statement;
      }),
      first: vi.fn().mockResolvedValue(firstResult),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ success: true }),
    };
    return statement;
  });

  const env = {
    DB: { prepare },
    APP_TOKEN: "test-token",
    VAPID_SUBJECT: "mailto:test@example.com",
    VAPID_PUBLIC_KEY: "public-key",
    VAPID_PRIVATE_KEY: "private-key",
  } as unknown as Env;

  return { env, prepare, calls };
}

function request(path: string, init: RequestInit = {}, withAuth = true): Request {
  const headers = new Headers(init.headers);
  if (withAuth) headers.set("Authorization", "Bearer test-token");
  headers.set("Content-Type", "application/json");
  return new Request(`http://localhost${path}`, { ...init, headers });
}

describe("GET /api/birthdays", () => {
  it("wymaga autoryzacji i nie dotyka bazy bez tokenu", async () => {
    const { env, prepare } = makeEnv();
    const response = await worker.fetch(request("/api/birthdays", {}, false), env);

    expect(response.status).toBe(401);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("sortuje listę po dacie w roku, nie po dacie dodania", async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(request("/api/birthdays"), env);

    expect(response.status).toBe(200);
    expect(calls[0].sql).toContain("ORDER BY month ASC, day ASC");
  });
});

describe("POST /api/birthdays", () => {
  it("zapisuje osobę z rocznikiem", async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays", {
        method: "POST",
        body: JSON.stringify({ name: "Anna", month: 3, day: 15, birth_year: 1990 }),
      }),
      env,
    );

    expect(response.status).toBe(201);
    expect(calls[0].binds).toEqual(["Anna", 3, 15, 1990]);
  });

  it("zapisuje osobę bez rocznika jako NULL", async () => {
    const { env, calls } = makeEnv();
    await worker.fetch(
      request("/api/birthdays", {
        method: "POST",
        body: JSON.stringify({ name: "Bartek", month: 12, day: 24 }),
      }),
      env,
    );

    expect(calls[0].binds).toEqual(["Bartek", 12, 24, null]);
  });

  it("odrzuca puste imię", async () => {
    const { env, prepare } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays", {
        method: "POST",
        body: JSON.stringify({ name: "   ", month: 3, day: 15 }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "name required" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("odrzuca datę spoza kalendarza", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays", {
        method: "POST",
        body: JSON.stringify({ name: "Anna", month: 2, day: 30 }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid date" });
  });

  it("odrzuca rocznik z przyszłości", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays", {
        method: "POST",
        body: JSON.stringify({ name: "Anna", month: 3, day: 15, birth_year: 3000 }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid birth year" });
  });
});

describe("PATCH /api/birthdays/:id", () => {
  it("zmiana daty zeruje last_notified_year, żeby poprawka zadziałała w tym roku", async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays/7", {
        method: "PATCH",
        body: JSON.stringify({ month: 4, day: 2 }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(calls[0].sql).toContain("last_notified_year = NULL");
    expect(calls[0].binds).toEqual([4, 2, 7]);
  });

  it("sama zmiana imienia NIE zeruje last_notified_year", async () => {
    const { env, calls } = makeEnv();
    await worker.fetch(
      request("/api/birthdays/7", {
        method: "PATCH",
        body: JSON.stringify({ name: "Ania" }),
      }),
      env,
    );

    expect(calls[0].sql).not.toContain("last_notified_year");
    expect(calls[0].binds).toEqual(["Ania", 7]);
  });

  it("odrzuca połowę daty jako niepoprawną", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays/7", {
        method: "PATCH",
        body: JSON.stringify({ month: 4 }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid date" });
  });

  it("zwraca 404, gdy osoby nie ma", async () => {
    const { env } = makeEnv(null);
    const response = await worker.fetch(
      request("/api/birthdays/99", {
        method: "PATCH",
        body: JSON.stringify({ name: "Duch" }),
      }),
      env,
    );

    expect(response.status).toBe(404);
  });

  it("odrzuca pustą aktualizację", async () => {
    const { env } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays/7", { method: "PATCH", body: JSON.stringify({}) }),
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "nothing to update" });
  });
});

describe("DELETE /api/birthdays/:id", () => {
  it("usuwa osobę i zwraca 204", async () => {
    const { env, calls } = makeEnv();
    const response = await worker.fetch(
      request("/api/birthdays/7", { method: "DELETE" }),
      env,
    );

    expect(response.status).toBe(204);
    expect(calls[0].sql).toBe("DELETE FROM birthdays WHERE id = ?");
    expect(calls[0].binds).toEqual([7]);
  });
});

describe("cron — bramka godzinowa urodzin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function runCron(env: Env): Promise<void> {
    return worker.scheduled(
      {} as ScheduledEvent,
      env,
      {} as ExecutionContext,
    );
  }

  const birthdayQueries = (calls: PreparedCall[]) =>
    calls.filter((call) => call.sql.includes("FROM birthdays"));

  it("przed 8:00 czasu lokalnego w ogóle nie pyta bazy o urodziny", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T04:00:00Z")); // 06:00 w Warszawie
    const { env, calls } = makeEnv();

    await runCron(env);

    expect(birthdayQueries(calls)).toHaveLength(0);
  });

  it("po 8:00 pyta o dzisiejszą datę i pomija powiadomionych w tym roku", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T07:00:00Z")); // 09:00 w Warszawie
    const { env, calls } = makeEnv();

    await runCron(env);

    const [query] = birthdayQueries(calls);
    expect(query).toBeDefined();
    expect(query.sql).toContain("last_notified_year IS NULL OR last_notified_year < ?");
    expect(query.binds).toEqual([2026, 7, 15]);
  });

  it("28 lutego w roku nieprzestępnym dopytuje też o rocznik 29 lutego", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-28T09:00:00Z")); // 10:00 w Warszawie
    const { env, calls } = makeEnv();

    await runCron(env);

    const [query] = birthdayQueries(calls);
    expect(query.binds).toEqual([2026, 2, 28, 2, 29]);
  });
});
