// Zakładka „Dziś": zaległe (wyróżnione) + dzisiejsze zadania, włączanie powiadomień, skrót do pomysłów.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks, useTaskActions } from "./useTaskActions";
import { TaskRow } from "./TaskRow";
import { isOverdue, isToday } from "../lib/tasks";
import { enablePush, notificationsGranted } from "../lib/push";

export function Today() {
  const { data: tasks, isLoading } = useTasks();
  const { toggle, remove } = useTaskActions();
  const navigate = useNavigate();

  const [granted, setGranted] = useState(notificationsGranted());
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  async function onEnablePush() {
    setPushMsg("Włączam…");
    const res = await enablePush();
    setGranted(res.ok);
    setPushMsg(res.ok ? "Powiadomienia włączone." : `Nie włączono: ${res.reason}`);
  }

  const open = (tasks ?? []).filter((t) => t.status === "open");
  const overdue = open.filter(isOverdue);
  const todays = open.filter((t) => !isOverdue(t) && isToday(t));

  const toggleArgs = (id: number, status: "open" | "done") => ({
    id,
    status: status === "done" ? ("open" as const) : ("done" as const),
  });

  return (
    <div className="space-y-5">
      {!granted && (
        <section className="rounded-lg border border-neutral-800 p-3">
          <button onClick={onEnablePush} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
            Włącz powiadomienia
          </button>
          {pushMsg && <p className="mt-2 text-xs text-neutral-400">{pushMsg}</p>}
        </section>
      )}

      {isLoading && <p className="text-sm text-neutral-500">Wczytuję…</p>}

      {overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-red-400">Zaległe</h2>
          <ul className="space-y-2">
            {overdue.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                overdue
                onToggle={() => toggle.mutate(toggleArgs(t.id, t.status))}
                onDelete={() => remove.mutate(t.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-300">Dziś</h2>
        <ul className="space-y-2">
          {todays.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => toggle.mutate(toggleArgs(t.id, t.status))}
              onDelete={() => remove.mutate(t.id)}
            />
          ))}
        </ul>
        {todays.length === 0 && <p className="text-sm text-neutral-500">Nic na dziś. 🎉</p>}
      </section>

      <button
        onClick={() => navigate("/ideas")}
        className="w-full rounded-lg border border-neutral-800 py-2 text-sm text-neutral-400 hover:text-neutral-200"
      >
        + Dorzuć pomysł
      </button>
    </div>
  );
}
