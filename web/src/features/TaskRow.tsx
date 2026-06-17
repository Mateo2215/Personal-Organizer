// Pojedynczy wiersz zadania (checkbox + treść + termin + edycja + usuń). Zaległe wyróżnione na różowo.
// Tap w ołówek przełącza wiersz w tryb edycji (treść + termin). Błąd zapisu nie gubi wpisanej treści.

import { useState, type FormEvent } from "react";
import { Check, Bell, Pencil, X } from "lucide-react";
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

  const done = task.status === "done";
  const hasTime = !!task.has_time;

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
      <li className="rounded-[16px] border border-accent/40 bg-card p-[13px]">
        <form onSubmit={submit} className="space-y-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Co masz zrobić?"
            autoFocus
            className="w-full rounded-[12px] border border-card-border bg-field px-3 py-2 text-ink placeholder:text-placeholder outline-none focus:border-accent/60"
          />
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-full rounded-[12px] border border-card-border bg-field px-3 py-2 text-sm text-muted outline-none focus:border-accent/60"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="accent-gradient flex-1 rounded-[12px] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-[12px] border border-card-border px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
            >
              Anuluj
            </button>
          </div>
          {error && (
            <p className="text-xs text-alarm-text">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-[15px] border px-[14px] py-[13px] transition-colors ${
        overdue && !done
          ? "border-alarm-border bg-alarm-bg"
          : "border-card-border bg-card hover:border-card-hover"
      } ${done ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition ${
          done ? "accent-gradient border-transparent" : overdue ? "border-alarm" : "border-faint"
        }`}
      >
        {done && <Check size={13} strokeWidth={3.5} className="text-white" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[14.5px] ${
            done ? "text-[#8a8699] line-through" : "text-ink"
          }`}
        >
          {task.content}
        </p>
        <p
          className={`mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold ${
            overdue && !done ? "text-alarm-text" : hasTime ? "text-accent" : "text-faint"
          }`}
        >
          {hasTime && <Bell size={12} strokeWidth={2} />}
          {formatLocal(hasTime ? task.due_at : null)}
        </p>
      </div>

      <button
        type="button"
        onClick={startEdit}
        className="shrink-0 text-faint transition-colors hover:text-accent"
        aria-label="Edytuj"
      >
        <Pencil size={15} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-faint transition-colors hover:text-alarm"
        aria-label="Usuń"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </li>
  );
}
