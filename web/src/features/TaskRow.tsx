// Pojedynczy wiersz zadania (checkbox + treść + termin + edycja + usuń). Zaległe wyróżnione na czerwono.
// Tap w ołówek przełącza wiersz w tryb edycji (treść + termin). Błąd zapisu nie gubi wpisanej treści.

import { useState, type FormEvent } from "react";
import {
  formatLocal,
  localInputToUtcIso,
  utcIsoToLocalInput,
  type Task,
  type TaskPatch,
} from "../lib/tasks";

export function TaskRow({
  task,
  onToggle,
  onDelete,
  onSave,
  overdue,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onSave: (patch: TaskPatch) => Promise<unknown>;
  overdue?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(task.content);
  const [due, setDue] = useState(utcIsoToLocalInput(task.has_time ? task.due_at : null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  function startEdit() {
    // Świeży snapshot zadania przy każdym wejściu w edycję (gdyby zmieniło się w tle).
    setContent(task.content);
    setDue(utcIsoToLocalInput(task.has_time ? task.due_at : null));
    setError(false);
    setEditing(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSaving(true);
    setError(false);
    try {
      await onSave({ content: text, due_at: due ? localInputToUtcIso(due) : null, has_time: !!due });
      setEditing(false);
    } catch {
      // Zapis padł (np. brak sieci) — zostajemy w edycji, treść użytkownika nietknięta.
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-indigo-700 bg-neutral-900 p-3">
        <form onSubmit={submit} className="space-y-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Co masz zrobić?"
            autoFocus
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none focus:border-indigo-500"
          />
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              Anuluj
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        overdue ? "border-red-900 bg-red-950/30" : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={onToggle}
        className="h-5 w-5 accent-indigo-500"
      />
      <div className="min-w-0 flex-1">
        <p className={task.status === "done" ? "truncate text-neutral-500 line-through" : "truncate"}>
          {task.content}
        </p>
        <p className={`text-xs ${overdue ? "text-red-400" : "text-neutral-500"}`}>
          {formatLocal(task.has_time ? task.due_at : null)}
        </p>
      </div>
      <button
        onClick={startEdit}
        className="text-sm text-neutral-500 hover:text-indigo-400"
        aria-label="Edytuj"
      >
        ✎
      </button>
      <button
        onClick={onDelete}
        className="text-sm text-neutral-500 hover:text-red-400"
        aria-label="Usuń"
      >
        ✕
      </button>
    </li>
  );
}
