// Zakładka „Dziś": nagłówek dnia z pierścieniem postępu, zaległe (wyróżnione) + dzisiejsze zadania,
// włączanie powiadomień, skrót do pomysłów.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BellRing, Sparkles } from "lucide-react";
import { useTasks, useTaskActions } from "./useTaskActions";
import { TaskRow } from "./TaskRow";
import { ProgressRing } from "../components/ProgressRing";
import { EmptyState } from "../components/EmptyState";
import { isOverdue, isToday } from "../lib/tasks";
import { enablePush, notificationsGranted } from "../lib/push";

// Data w formacie „pon · 16 cze" (wyświetlana uppercase przez CSS).
function todayEyebrow(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("pl-PL", { weekday: "short" }).replace(".", "");
  const month = now.toLocaleDateString("pl-PL", { month: "short" }).replace(".", "");
  return `${weekday} · ${now.getDate()} ${month}`;
}

export function Today() {
  const { data: tasks, isLoading } = useTasks();
  const { toggle, remove, update } = useTaskActions();
  const navigate = useNavigate();

  const [granted, setGranted] = useState(notificationsGranted());
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  async function onEnablePush() {
    setPushMsg("Włączam…");
    try {
      const res = await enablePush();
      setGranted(res.ok);
      setPushMsg(res.ok ? "Powiadomienia włączone." : `Nie włączono: ${res.reason}`);
    } catch {
      // np. błąd /api/config — nie zostawiamy UI na „Włączam…".
      setPushMsg("Nie udało się włączyć powiadomień. Spróbuj ponownie.");
    }
  }

  const all = tasks ?? [];
  const open = all.filter((t) => t.status === "open");
  const overdue = open.filter(isOverdue);
  const todays = open.filter((t) => !isOverdue(t) && isToday(t));

  // Postęp dnia: zrobione / wszystkie dzisiejsze (niezależnie od statusu).
  const dayTasks = all.filter(isToday);
  const dayDone = dayTasks.filter((t) => t.status === "done").length;

  const toggleArgs = (id: number, status: "open" | "done") => ({
    id,
    status: status === "done" ? ("open" as const) : ("done" as const),
  });

  const isEmpty = !isLoading && overdue.length === 0 && todays.length === 0;

  return (
    <div className="space-y-4">
      {/* Nagłówek dnia */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{todayEyebrow()}</p>
          <h2 className="mt-1 font-display text-[23px] font-semibold tracking-[-0.02em] text-ink">
            Dzień dobry 👋
          </h2>
        </div>
        <ProgressRing done={dayDone} total={dayTasks.length} />
      </div>

      {!granted && (
        <button
          onClick={onEnablePush}
          className="accent-gradient accent-glow flex w-full items-center justify-center gap-2 rounded-[15px] py-3 text-[15px] font-bold text-white"
        >
          <BellRing size={18} strokeWidth={2} />
          Włącz powiadomienia
        </button>
      )}
      {pushMsg && <p className="text-xs text-muted">{pushMsg}</p>}

      {isLoading && <p className="text-sm text-faint">Wczytuję…</p>}

      {isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title="Czysto na dziś"
          description="Nic nie czeka na dziś. Dorzuć zadanie albo złap pomysł, zanim ucieknie."
          actions={[
            { label: "Dodaj zadanie", onClick: () => navigate("/tasks"), variant: "primary" },
            { label: "Złap pomysł", onClick: () => navigate("/ideas"), variant: "secondary" },
          ]}
        />
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-alarm-text">
                <span className="inline-block h-2 w-2 rounded-full bg-alarm shadow-[0_0_8px_rgba(255,111,142,0.85)]" />
                Zaległe
              </h3>
              <ul className="space-y-2.5">
                {overdue.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    overdue
                    onToggle={() => toggle.mutate(toggleArgs(t.id, t.status))}
                    onDelete={() => remove.mutate(t.id)}
                    onSave={(patch) => update.mutateAsync({ id: t.id, patch })}
                  />
                ))}
              </ul>
            </section>
          )}

          {todays.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-[13px] font-bold text-subtle">Dziś</h3>
              <ul className="space-y-2.5">
                {todays.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggle.mutate(toggleArgs(t.id, t.status))}
                    onDelete={() => remove.mutate(t.id)}
                    onSave={(patch) => update.mutateAsync({ id: t.id, patch })}
                  />
                ))}
              </ul>
            </section>
          )}

          <button
            onClick={() => navigate("/ideas")}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[rgb(150_124_255_/_0.45)] bg-[rgb(150_124_255_/_0.07)] py-3.5 text-sm font-bold text-accent-soft transition-colors hover:bg-[rgb(150_124_255_/_0.12)]"
          >
            <Plus size={18} strokeWidth={2.5} />
            Dorzuć pomysł
          </button>
        </>
      )}
    </div>
  );
}
