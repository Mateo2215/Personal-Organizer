// Pojedynczy wiersz rutyny (codzienne zadanie): checkbox + treść + ikona „powtarzalne" (↻).
// Tryb zarządzania (gdy podano onRename/onDelete): ołówek → rename inline + usuń.
// Na „Dziś" przekazujemy tylko onToggle (sam check), bez ołówka/kosza.

import { useState, type FormEvent } from "react";
import { Check, Repeat, Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "../components/ConfirmDeleteButton";
import type { Routine } from "../lib/routines";

export function RoutineRow({
  routine,
  done,
  onToggle,
  onRename,
  onDelete,
}: {
  routine: Routine;
  done: boolean;
  onToggle: () => void;
  onRename?: (content: string) => Promise<unknown>;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(routine.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const manageable = !!onRename || !!onDelete;

  function startEdit() {
    // Świeży snapshot przy każdym wejściu w edycję (gdyby zmieniło się w tle).
    setContent(routine.content);
    setError(false);
    setEditing(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !onRename) return;
    setSaving(true);
    setError(false);
    try {
      await onRename(text);
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
            placeholder="Nazwa rutyny"
            autoFocus
            className="w-full rounded-[12px] border border-card-border bg-field px-3 py-2 text-ink placeholder:text-placeholder outline-none focus:border-accent/60"
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
      className={`flex items-center gap-3 rounded-[15px] border border-card-border bg-card px-[14px] py-[13px] transition-colors hover:border-card-hover ${
        done ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition ${
          done ? "accent-gradient border-transparent" : "border-faint"
        }`}
      >
        {done && <Check size={13} strokeWidth={3.5} className="text-white" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14.5px] ${done ? "text-[#8a8699] line-through" : "text-ink"}`}>
          {routine.content}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-faint">
          <Repeat size={12} strokeWidth={2} />
          Codziennie
        </p>
      </div>

      {manageable && (
        <>
          {onRename && (
            <button
              type="button"
              onClick={startEdit}
              className="shrink-0 text-faint transition-colors hover:text-accent"
              aria-label="Zmień nazwę"
            >
              <Pencil size={15} strokeWidth={2} />
            </button>
          )}
          {onDelete && <ConfirmDeleteButton onDelete={onDelete} label="Usuń rutynę" />}
        </>
      )}
    </li>
  );
}
