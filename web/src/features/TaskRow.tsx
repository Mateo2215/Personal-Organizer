// Pojedynczy wiersz zadania (checkbox + treść + termin + edycja + usuń). Zaległe wyróżnione na różowo.
// Tap w ołówek przełącza wiersz w tryb edycji (treść + termin). Błąd zapisu nie gubi wpisanej treści.

import { useState, type FormEvent } from "react";
import { Check, Bell, Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "../components/ConfirmDeleteButton";
import { ReminderOffsetPicker } from "./ReminderOffsetPicker";
import {
  formatTaskDue,
  formatRelativeToDue,
  localInputToUtcIso,
  offsetLabel,
  utcIsoToLocalInput,
  type ReminderOffset,
  type Task,
  type TaskPatch,
} from "../lib/tasks";

export function TaskRow({
  task,
  now,
  onToggle,
  onDelete,
  onSave,
  overdue,
}: {
  task: Task;
  now: number;
  onToggle: () => void;
  onDelete: () => void;
  onSave: (patch: TaskPatch) => Promise<unknown>;
  overdue?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(task.content);
  const [due, setDue] = useState(utcIsoToLocalInput(task.has_time ? task.due_at : null));
  const [offset, setOffset] = useState<ReminderOffset>((task.reminder_offset_minutes as ReminderOffset) ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const done = task.status === "done";
  const hasTime = !!task.has_time;
  const reminderLabel = offsetLabel(task.reminder_offset_minutes);

  function startEdit() {
    // Świeży snapshot zadania przy każdym wejściu w edycję (gdyby zmieniło się w tle).
    setContent(task.content);
    setDue(utcIsoToLocalInput(task.has_time ? task.due_at : null));
    setOffset((task.reminder_offset_minutes as ReminderOffset) ?? 0);
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
      // Bez terminu nie ma wyprzedzenia — wymuś 0 (backend i tak to wymusi).
      await onSave({
        content: text,
        due_at: due ? localInputToUtcIso(due) : null,
        has_time: !!due,
        reminder_offset_minutes: due ? offset : 0,
      });
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
          {due && <p className="text-xs text-faint">{formatTaskDue(localInputToUtcIso(due))}</p>}
          {/* Wyprzedzenie tylko, gdy ustawiono termin z godziną. */}
          {due && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Bell size={13} strokeWidth={2} className="shrink-0 text-accent" />
              <ReminderOffsetPicker value={offset} onChange={setOffset} />
            </div>
          )}
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
          {formatTaskDue(hasTime ? task.due_at : null)}
          {hasTime && !done && task.due_at && (
            <span className="font-medium text-faint">· {formatRelativeToDue(task.due_at, now)}</span>
          )}
        </p>
        {reminderLabel && (
          <p className="mt-0.5 text-[11px] text-faint">Przypomnienie: {reminderLabel}</p>
        )}
      </div>

      <button
        type="button"
        onClick={startEdit}
        className="shrink-0 text-faint transition-colors hover:text-accent"
        aria-label="Edytuj"
      >
        <Pencil size={15} strokeWidth={2} />
      </button>
      <ConfirmDeleteButton onDelete={onDelete} label="Usuń zadanie" />
    </li>
  );
}
