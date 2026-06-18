// Core task reminder logic — extracted for testability (no D1 or Workers runtime needed).

export interface ReminderTask {
  id: number;
  content: string;
}

// Generic over subscription shape — tests use { id }, production uses StoredSubscription.
export async function processTaskReminders<S extends { id: number }>(
  tasks: ReminderTask[],
  subs: S[],
  deps: {
    sendPush: (sub: S, task: ReminderTask) => Promise<number>;
    setRemindedAt: (taskId: number) => Promise<void>;
    deleteSub: (subId: number) => Promise<void>;
  },
): Promise<void> {
  for (const task of tasks) {
    let atLeastOneSuccess = false;

    for (const sub of subs) {
      try {
        const status = await deps.sendPush(sub, task);
        if (status >= 200 && status < 300) atLeastOneSuccess = true;
        if (status === 404 || status === 410) await deps.deleteSub(sub.id);
      } catch (err) {
        // Transient error — log and continue. Task stays eligible for next cron cycle.
        console.error(
          `[cron] push to sub ${sub.id} for task ${task.id} failed:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // Set reminded_at only after at least one push service accepted the message (2xx).
    // If all pushes failed or no subscriptions exist, leave reminded_at NULL so the
    // next cron cycle can retry.
    if (atLeastOneSuccess) await deps.setRemindedAt(task.id);
  }
}
