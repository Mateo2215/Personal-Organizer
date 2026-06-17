// Zakładka „Zadania": composer (treść + termin) + filtry (Wszystkie/Dziś/Nadchodzące) + lista.

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, ListChecks, Repeat } from "lucide-react";
import { addTask, localInputToUtcIso, isOverdue, isToday, isUpcoming } from "../lib/tasks";
import { isDoneToday } from "../lib/routines";
import { useTasks, useTaskActions } from "./useTaskActions";
import { useRoutines, useRoutineActions } from "./useRoutineActions";
import { TaskRow } from "./TaskRow";
import { RoutineRow } from "./RoutineRow";
import { EmptyState } from "../components/EmptyState";

type Filter = "all" | "today" | "upcoming";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "today", label: "Dziś" },
  { key: "upcoming", label: "Nadchodzące" },
];

// Lokalny input "YYYY-MM-DDTHH:mm" → krótka etykieta chipa "16.06, 14:00".
function chipLabel(local: string): string {
  const d = new Date(local);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks, isLoading, isError } = useTasks();
  const { toggle, remove, update } = useTaskActions();

  const add = useMutation({
    mutationFn: addTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { data: routines } = useRoutines();
  const { add: addRoutine, rename: renameRoutine, remove: removeRoutine, toggle: toggleRoutine } =
    useRoutineActions();

  const [content, setContent] = useState("");
  const [due, setDue] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [routineContent, setRoutineContent] = useState("");

  function submitRoutine(e: FormEvent) {
    e.preventDefault();
    const text = routineContent.trim();
    if (!text) return;
    addRoutine.mutate(text, {
      // Czyścimy pole dopiero po udanym zapisie — przy błędzie treść zostaje.
      onSuccess: () => setRoutineContent(""),
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    add.mutate(
      { content: text, due_at: due ? localInputToUtcIso(due) : null, has_time: !!due },
      // Czyścimy pola dopiero po udanym zapisie — przy błędzie treść zostaje (brak utraty).
      { onSuccess: () => { setContent(""); setDue(""); } },
    );
  }

  const visible = (tasks ?? []).filter((t) =>
    filter === "today" ? isToday(t) : filter === "upcoming" ? isUpcoming(t) : true,
  );

  return (
    <div className="space-y-4">
      {/* Composer */}
      <form onSubmit={submit} className="space-y-3 rounded-[18px] border border-card-border bg-card p-[13px]">
        <div className="flex items-center gap-2.5">
          <ListChecks size={18} strokeWidth={2.5} className="shrink-0 text-accent" />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Co masz zrobić?"
            className="w-full bg-transparent text-ink placeholder:text-placeholder outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="relative flex cursor-pointer items-center gap-2 rounded-[20px] border border-card-border bg-field px-3.5 py-2 text-sm">
            <Calendar size={15} strokeWidth={2} className="text-accent" />
            <span className={due ? "text-ink" : "text-muted"}>{due ? chipLabel(due) : "Termin"}</span>
            <input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Termin zadania"
            />
          </label>
          <button
            type="submit"
            disabled={add.isPending || !content.trim()}
            className="accent-gradient rounded-[14px] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {add.isPending ? "Dodaję…" : "Dodaj"}
          </button>
        </div>
        {add.isError && (
          <p className="text-sm text-alarm-text">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
        )}
      </form>

      {/* Filtry */}
      <div className="flex gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-[20px] px-3.5 py-[7px] text-sm font-semibold transition-colors ${
              filter === key
                ? "accent-gradient text-white"
                : "border border-card-border bg-white/[0.05] text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-faint">Wczytuję…</p>}
      {isError && <p className="text-sm text-alarm-text">Błąd wczytywania zadań.</p>}

      {!isLoading && visible.length === 0 && filter === "all" ? (
        <EmptyState
          icon={ListChecks}
          title="Brak zadań"
          description="Dodaj pierwsze zadanie w polu powyżej — z terminem dostaniesz przypomnienie."
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              overdue={isOverdue(t)}
              onToggle={() => toggle.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })}
              onDelete={() => remove.mutate(t.id)}
              onSave={(patch) => update.mutateAsync({ id: t.id, patch })}
            />
          ))}
          {!isLoading && visible.length === 0 && (
            <li className="py-2 text-sm text-faint">Brak zadań w tym filtrze.</li>
          )}
        </ul>
      )}

      {/* Codzienne (rutyny) — powtarzalne zadania bez godziny i bez push; odhaczasz je w „Dziś". */}
      <section className="space-y-3 pt-2">
        <h3 className="flex items-center gap-2 text-[13px] font-bold text-subtle">
          <Repeat size={15} strokeWidth={2.5} className="text-accent" />
          Codzienne
        </h3>

        <form onSubmit={submitRoutine} className="flex items-center gap-2 rounded-[18px] border border-card-border bg-card p-[13px]">
          <input
            value={routineContent}
            onChange={(e) => setRoutineContent(e.target.value)}
            placeholder="Nowa codzienna rutyna…"
            className="w-full bg-transparent text-ink placeholder:text-placeholder outline-none"
          />
          <button
            type="submit"
            disabled={addRoutine.isPending || !routineContent.trim()}
            className="accent-gradient shrink-0 rounded-[14px] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {addRoutine.isPending ? "Dodaję…" : "Dodaj"}
          </button>
        </form>
        {addRoutine.isError && (
          <p className="text-sm text-alarm-text">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
        )}

        {(routines ?? []).length === 0 ? (
          <p className="text-sm text-faint">
            Brak rutyn. Dodaj powtarzalne obowiązki bez godziny — pojawią się na górze „Dziś".
          </p>
        ) : (
          <ul className="space-y-2.5">
            {(routines ?? []).map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                done={isDoneToday(r)}
                onToggle={() => toggleRoutine.mutate({ id: r.id, done: !isDoneToday(r) })}
                onRename={(text) => renameRoutine.mutateAsync({ id: r.id, content: text })}
                onDelete={() => removeRoutine.mutate(r.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
