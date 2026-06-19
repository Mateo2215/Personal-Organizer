// Zakładka „Kalendarz": agenda-lista nadchodzących zadań z terminem, pogrupowana po dacie lokalnej.
// Tylko zadania z terminem (bez rutyn), wszystkie przyszłe od dziś. Tap = toggle done; edycja w „Zadania".

import { useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useTasks, useTaskActions } from "./useTaskActions";
import { useMinuteNow } from "./useMinuteNow";
import { CalendarTaskRow } from "./CalendarTaskRow";
import { WeekStrip } from "./WeekStrip";
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
  const now = useMinuteNow();
  const [selected, setSelected] = useState<string | null>(null); // wybrany dzień z paska tygodnia

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

  // Dni z co najmniej jednym zadaniem (do kropek na pasku) = klucze grup agendy.
  const busyDays = useMemo(() => new Set(groups.map(([key]) => key)), [groups]);

  // Po wyborze dnia zawężamy agendę tylko do niego; bez wyboru pokazujemy wszystko.
  const shown = selected ? groups.filter(([key]) => key === selected) : groups;

  return (
    <div className="space-y-5">
      <div className="pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Agenda</p>
        <h2 className="mt-1 font-display text-[23px] font-semibold tracking-[-0.02em] text-ink">Kalendarz</h2>
      </div>

      <WeekStrip busyDays={busyDays} selected={selected} onSelect={setSelected} />

      {selected && (
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 rounded-full border border-card-border bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
        >
          <X size={13} strokeWidth={2.5} />
          Pokaż wszystkie
        </button>
      )}

      {isLoading && <p className="text-sm text-faint">Wczytuję…</p>}
      {isError && <p className="text-sm text-alarm-text">Błąd wczytywania zadań.</p>}

      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={selected ? "Nic w tym dniu" : "Nic w planach"}
          description={
            selected
              ? "W wybranym dniu nie masz zaplanowanych zadań. Wybierz inny dzień lub pokaż wszystkie."
              : "Brak nadchodzących zadań z terminem. Dodaj zadanie z datą w „Zadania”, a pojawi się tutaj."
          }
        />
      )}

      {shown.map(([key, dayTasks]) => (
        <section key={key} className="space-y-2.5">
          <h3 className="text-[13px] font-bold text-subtle">{dayHeading(key)}</h3>
          <ul className="space-y-2.5">
            {dayTasks.map((t) => (
              <CalendarTaskRow
                key={t.id}
                task={t}
                now={now}
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
