// Pola urodzin — wspólne dla dodawania i edycji, żeby walidacja daty żyła w jednym miejscu.
// Rocznik jest opcjonalny: bez niego pokazujemy samo imię, z nim liczymy kończony wiek.

import { useState, type FormEvent } from "react";
import { MONTHS, daysInMonth, type NewBirthday } from "../lib/birthdays";

const FIELD_CLASS =
  "w-full rounded-[12px] border border-card-border bg-field px-3 py-2.5 text-sm text-ink placeholder:text-placeholder outline-none focus:border-accent/60";

export function BirthdayForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: NewBirthday;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: NewBirthday) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [month, setMonth] = useState(initial?.month ?? 1);
  const [day, setDay] = useState(initial?.day ?? 1);
  const [year, setYear] = useState(initial?.birth_year ? String(initial.birth_year) : "");
  const [localError, setLocalError] = useState<string | null>(null);

  const maxDay = daysInMonth(month);

  // Zmiana miesiąca na krótszy nie może zostawić niemożliwego dnia (31 lutego).
  function onMonthChange(next: number) {
    setMonth(next);
    if (day > daysInMonth(next)) setDay(daysInMonth(next));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError("Podaj imię.");
      return;
    }
    // Pusty rocznik to świadomy wybór („nie wiem"), nie błąd.
    const parsedYear = year.trim() === "" ? null : Number(year);
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > new Date().getFullYear())) {
      setLocalError("Rocznik musi być z przedziału 1900 – dziś.");
      return;
    }
    setLocalError(null);
    onSubmit({ name: trimmed, month, day, birth_year: parsedYear });
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Imię, np. Anna"
        aria-label="Imię"
        className={FIELD_CLASS}
      />

      <div className="flex gap-2.5">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          aria-label="Dzień"
          className={`${FIELD_CLASS} w-[6.5rem]`}
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          aria-label="Miesiąc"
          className={FIELD_CLASS}
        >
          {MONTHS.map((label, index) => (
            <option key={label} value={index + 1}>{label}</option>
          ))}
        </select>
      </div>

      <input
        value={year}
        onChange={(e) => setYear(e.target.value)}
        inputMode="numeric"
        placeholder="Rocznik (opcjonalnie), np. 1990"
        aria-label="Rocznik"
        className={FIELD_CLASS}
      />

      {(localError || error) && <p className="text-xs text-alarm-text">{localError ?? error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="accent-gradient accent-glow flex-1 rounded-[13px] py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {pending ? "Zapisuję…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-2 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40"
          >
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}
