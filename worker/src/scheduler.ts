// Core task reminder logic — extracted for testability (no D1 or Workers runtime needed).

export interface ReminderTask {
  id: number;
  content: string;
  reminder_offset_minutes: number;
}

// Tytuł powiadomienia zależny od wyprzedzenia: 0 = „Przypomnienie", inaczej „Za X".
// Pure — testowalny bez runtime Workers (handler w index.ts woła go przy budowie payloadu push).
export function reminderTitle(offsetMinutes: number): string {
  switch (offsetMinutes) {
    case 15: return "Za 15 min";
    case 30: return "Za 30 min";
    case 60: return "Za 1 godz.";
    default: return "Przypomnienie";
  }
}

// Wspólna polityka wysyłki dla wszystkiego, co cron pcha w push (zadania, urodziny).
// Trzymana w JEDNYM miejscu celowo: reguła "ślad dopiero po 2xx" jest subtelna i poprawiona
// w dwóch kopiach rozjechałaby się przy pierwszej zmianie.
// Generic over subscription shape — tests use { id }, production uses StoredSubscription.
export async function notifySubscribers<T extends { id: number }, S extends { id: number }>(
  items: T[],
  subs: S[],
  deps: {
    sendPush: (sub: S, item: T) => Promise<number>;
    markSent: (item: T) => Promise<void>;
    deleteSub: (subId: number) => Promise<void>;
  },
  label = "task",
): Promise<void> {
  for (const item of items) {
    let atLeastOneSuccess = false;

    for (const sub of subs) {
      try {
        const status = await deps.sendPush(sub, item);
        if (status >= 200 && status < 300) atLeastOneSuccess = true;
        if (status === 404 || status === 410) await deps.deleteSub(sub.id);
      } catch (err) {
        // Transient error — log and continue. Item stays eligible for next cron cycle.
        console.error(
          `[cron] push to sub ${sub.id} for ${label} ${item.id} failed:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // Mark as sent only after at least one push service accepted the message (2xx).
    // If all pushes failed or no subscriptions exist, leave the marker untouched so the
    // next cron cycle can retry.
    if (atLeastOneSuccess) await deps.markSent(item);
  }
}

// Cienka nakładka na notifySubscribers — zachowana, by nie ruszać wołających ani testów.
export async function processTaskReminders<S extends { id: number }>(
  tasks: ReminderTask[],
  subs: S[],
  deps: {
    sendPush: (sub: S, task: ReminderTask) => Promise<number>;
    setRemindedAt: (taskId: number) => Promise<void>;
    deleteSub: (subId: number) => Promise<void>;
  },
): Promise<void> {
  await notifySubscribers(tasks, subs, {
    sendPush: deps.sendPush,
    markSent: (task) => deps.setRemindedAt(task.id),
    deleteSub: deps.deleteSub,
  }, "task");
}
