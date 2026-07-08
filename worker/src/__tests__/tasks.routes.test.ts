// Testy HTTP tras zadań chronią autoryzację i zakres zbiorczego usuwania.

import { describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../index";

function makeEnv() {
  const run = vi.fn().mockResolvedValue({ success: true });
  const prepare = vi.fn().mockReturnValue({ run });
  const env = {
    DB: { prepare },
    APP_TOKEN: "test-token",
    VAPID_SUBJECT: "mailto:test@example.com",
    VAPID_PUBLIC_KEY: "public-key",
    VAPID_PRIVATE_KEY: "private-key",
  } as unknown as Env;

  return { env, prepare, run };
}

describe("DELETE /api/tasks/completed", () => {
  it("usuwa wyłącznie wykonane zwykłe zadania i zwraca 204", async () => {
    const { env, prepare, run } = makeEnv();
    const response = await worker.fetch(
      new Request("http://localhost/api/tasks/completed", {
        method: "DELETE",
        headers: { Authorization: "Bearer test-token" },
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith("DELETE FROM tasks WHERE status = 'done'");
    expect(run).toHaveBeenCalledOnce();
  });

  it("odrzuca brak autoryzacji bez dotykania bazy", async () => {
    const { env, prepare } = makeEnv();
    const response = await worker.fetch(
      new Request("http://localhost/api/tasks/completed", { method: "DELETE" }),
      env,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    expect(prepare).not.toHaveBeenCalled();
  });
});
