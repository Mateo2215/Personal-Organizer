// Zakładka „Kalendarz": agenda-lista nadchodzących zadań z terminem, pogrupowana po dacie lokalnej.
// Tylko zadania z terminem (bez rutyn), wszystkie przyszłe od dziś. Tap = toggle done; edycja w „Zadania".

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useTasks, useTaskActions } from "./useTaskActions";
import { CalendarTaskRow } from "./CalendarTaskRow";
import { EmptyState } from "../components/EmptyState";
import { isScheduledFromToday, localDateKey, type Task } from "../lib/tasks";

// Klucz dnia "YYYY-MM-DD" → nagłówek sekcji: „Dziś" / „Jutro" / „śr · 18 cze".
function dayHeading(key: string): string {
  const todayKey = localDateKey(new Date().toISOString());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow.toISOString());

  if (key === todayKey) return "Dziś";
  if (key === tomorrowKey) return "Jutro";

  // "YYYY-MM-DD" → lokalna data (bez przesunięcia strefy) → „śr · 18 cze".
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("pl-PL", { weekday: "short" }).replace(".", "");
  const month = date.toLocaleDateString("pl-PL", { month: "short" }).replace(".", "");
  return `${weekday} · ${date.getDate()} ${month}`;
}

export function Calendar() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { toggle } = useTaskActions();

  // Filtruj do zaplanowanych od dziś, posortuj rosnąco po terminie, pogrupuj po dacie lokalnej.
  const groups = useMemo(() => {
    const scheduled = (tasks ?? [])
      .filter(isScheduledFromToday)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

    const byDay = new Map<string, Task[]>();
    for (const t of scheduled) {
      const key = localDateKey(t.due_at!);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(t);
      else byDay.set(key, [t]);
    }
    // Map zachowuje kolejność wstawiania, a wstawialiśmy już posortowane → dni rosnąco.
    return [...byDay.entries()];
  }, [tasks]);

  return (
    <div className="space-y-5">
      <div className="pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Agenda</p>
        <h2 className="mt-1 font-display text-[23px] font-semibold tracking-[-0.02em] text-ink">Kalendarz</h2>
      </div>

      {isLoading && <p className="text-sm text-faint">Wczytuję…</p>}
      {isError && <p className="text-sm text-alarm-text">Błąd wczytywania zadań.</p>}

      {!isLoading && !isError && groups.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nic w planach"
          description="Brak nadchodzących zadań z terminem. Dodaj zadanie z datą w „Zadania”, a pojawi się tutaj."
        />
      )}

      {groups.map(([key, dayTasks]) => (
        <section key={key} className="space-y-2.5">
          <h3 className="text-[13px] font-bold text-subtle">{dayHeading(key)}</h3>
          <ul className="space-y-2.5">
            {dayTasks.map((t) => (
              <CalendarTaskRow
                key={t.id}
                task={t}
                onToggle={() =>
                  toggle.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })
                }
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
