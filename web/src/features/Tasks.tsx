// Lista i formularz zadań (Faza 1: minimalny, pod test push). Pełne zakładki dochodzą później.

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTask,
  deleteTask,
  formatLocal,
  listTasks,
  localInputToUtcIso,
  patchTask,
} from "../lib/tasks";

export function Tasks() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const { data: tasks, isLoading, isError } = useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });

  const add = useMutation({ mutationFn: addTask, onSuccess: invalidate });
  const toggle = useMutation({
    mutationFn: (v: { id: number; status: "open" | "done" }) => patchTask(v.id, { status: v.status }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteTask, onSuccess: invalidate });

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
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={() => toggle.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })}
              className="h-5 w-5 accent-indigo-500"
            />
            <div className="min-w-0 flex-1">
              <p className={t.status === "done" ? "truncate text-neutral-500 line-through" : "truncate"}>
                {t.content}
              </p>
              <p className="text-xs text-neutral-500">{formatLocal(t.has_time ? t.due_at : null)}</p>
            </div>
            <button
              onClick={() => remove.mutate(t.id)}
              className="text-sm text-neutral-500 hover:text-red-400"
              aria-label="Usuń"
            >
              ✕
            </button>
          </li>
        ))}
        {tasks?.length === 0 && <p className="text-sm text-neutral-500">Brak zadań.</p>}
      </ul>
    </div>
  );
}
