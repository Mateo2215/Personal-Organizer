// Zakładka „Zadania": formularz dodawania + lista wszystkich (nadchodzące wg daty).

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addTask, localInputToUtcIso } from "../lib/tasks";
import { useTasks, useTaskActions } from "./useTaskActions";
import { TaskRow } from "./TaskRow";
import { isOverdue } from "../lib/tasks";

export function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks, isLoading, isError } = useTasks();
  const { toggle, remove, update } = useTaskActions();

  const add = useMutation({
    mutationFn: addTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const [content, setContent] = useState("");
  const [due, setDue] = useState("");

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

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Co masz zrobić?"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={add.isPending || !content.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {add.isPending ? "Dodaję…" : "Dodaj"}
          </button>
        </div>
        {add.isError && (
          <p className="text-sm text-red-400">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
        )}
      </form>

      {isLoading && <p className="text-sm text-neutral-500">Wczytuję…</p>}
      {isError && <p className="text-sm text-red-400">Błąd wczytywania zadań.</p>}

      <ul className="space-y-2">
        {tasks?.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            overdue={isOverdue(t)}
            onToggle={() => toggle.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })}
            onDelete={() => remove.mutate(t.id)}
            onSave={(patch) => update.mutateAsync({ id: t.id, patch })}
          />
        ))}
        {tasks?.length === 0 && <p className="text-sm text-neutral-500">Brak zadań.</p>}
      </ul>
    </div>
  );
}
