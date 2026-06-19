import { describe, it, expect, vi } from "vitest";
import { processTaskReminders, reminderTitle } from "../scheduler";

const task = { id: 1, content: "Spotkanie z klientem", reminder_offset_minutes: 0 };
const sub = { id: 10 };

function makeDeps(sendResult: () => Promise<number>) {
  return {
    sendPush: vi.fn().mockImplementation(sendResult),
    setRemindedAt: vi.fn().mockResolvedValue(undefined),
    deleteSub: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processTaskReminders", () => {
  it("ustawia reminded_at po odpowiedzi 201", async () => {
    const deps = makeDeps(() => Promise.resolve(201));
    await processTaskReminders([task], [sub], deps);
    expect(deps.setRemindedAt).toHaveBeenCalledOnce();
    expect(deps.setRemindedAt).toHaveBeenCalledWith(task.id);
  });

  it("ustawia reminded_at po odpowiedzi 200", async () => {
    const deps = makeDeps(() => Promise.resolve(200));
    await processTaskReminders([task], [sub], deps);
    expect(deps.setRemindedAt).toHaveBeenCalledWith(task.id);
  });

  it("NIE ustawia reminded_at gdy sendPush rzuca wyjątek", async () => {
    const deps = makeDeps(() => Promise.reject(new Error("network error")));
    await processTaskReminders([task], [sub], deps);
    expect(deps.setRemindedAt).not.toHaveBeenCalled();
  });

  it("NIE ustawia reminded_at po odpowiedzi 429 (rate limit)", async () => {
    const deps = makeDeps(() => Promise.resolve(429));
    await processTaskReminders([task], [sub], deps);
    expect(deps.setRemindedAt).not.toHaveBeenCalled();
  });

  it("NIE ustawia reminded_at po odpowiedzi 500", async () => {
    const deps = makeDeps(() => Promise.resolve(500));
    await processTaskReminders([task], [sub], deps);
    expect(deps.setRemindedAt).not.toHaveBeenCalled();
  });

  it("NIE ustawia reminded_at gdy brak subskrypcji", async () => {
    const deps = makeDeps(() => Promise.resolve(201));
    await processTaskReminders([task], [], deps);
    expect(deps.setRemindedAt).not.toHaveBeenCalled();
  });

  it("ustawia reminded_at gdy choć jedna subskrypcja zwróci 2xx (inna pada)", async () => {
    const sub2 = { id: 11 };
    const sendPush = vi.fn()
      .mockResolvedValueOnce(500)  // sub 10 — błąd serwera
      .mockResolvedValueOnce(201); // sub 11 — sukces
    const deps = {
      sendPush,
      setRemindedAt: vi.fn().mockResolvedValue(undefined),
      deleteSub: vi.fn().mockResolvedValue(undefined),
    };
    await processTaskReminders([task], [sub, sub2], deps);
    expect(deps.setRemindedAt).toHaveBeenCalledWith(task.id);
  });

  it("usuwa subskrypcję po 404 i NIE ustawia reminded_at", async () => {
    const deps = makeDeps(() => Promise.resolve(404));
    await processTaskReminders([task], [sub], deps);
    expect(deps.deleteSub).toHaveBeenCalledWith(sub.id);
    expect(deps.setRemindedAt).not.toHaveBeenCalled();
  });

  it("usuwa subskrypcję po 410 i NIE ustawia reminded_at", async () => {
    const deps = makeDeps(() => Promise.resolve(410));
    await processTaskReminders([task], [sub], deps);
    expect(deps.deleteSub).toHaveBeenCalledWith(sub.id);
    expect(deps.setRemindedAt).not.toHaveBeenCalled();
  });

  it("przetwarza wiele zadań niezależnie", async () => {
    const task2 = { id: 2, content: "Drugie zadanie", reminder_offset_minutes: 0 };
    const sendPush = vi.fn()
      .mockResolvedValueOnce(201) // task 1 — sukces
      .mockResolvedValueOnce(500); // task 2 — błąd
    const deps = {
      sendPush,
      setRemindedAt: vi.fn().mockResolvedValue(undefined),
      deleteSub: vi.fn().mockResolvedValue(undefined),
    };
    await processTaskReminders([task, task2], [sub], deps);
    expect(deps.setRemindedAt).toHaveBeenCalledOnce();
    expect(deps.setRemindedAt).toHaveBeenCalledWith(task.id);
  });
});

describe("reminderTitle", () => {
  it("dla offsetu 0 zwraca tytul o terminie", () => {
    expect(reminderTitle(0)).toBe("Przypomnienie");
  });

  it("dla wyprzedzen zwraca etykiete Za X", () => {
    expect(reminderTitle(15)).toBe("Za 15 min");
    expect(reminderTitle(30)).toBe("Za 30 min");
    expect(reminderTitle(60)).toBe("Za 1 godz.");
  });

  it("dla nieznanej wartosci spada do tytulu o terminie", () => {
    expect(reminderTitle(45)).toBe("Przypomnienie");
  });
});
