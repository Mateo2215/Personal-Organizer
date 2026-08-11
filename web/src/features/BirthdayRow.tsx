// Wiersz osoby na liście urodzin: dzień, imię, podpis „dziś / za X dni" i kończony wiek.
// Tap w wiersz otwiera edycję (obsługiwaną wyżej), X usuwa przez wspólny dwukrok.

import { ConfirmDeleteButton } from "../components/ConfirmDeleteButton";
import { daysUntil, turningAge, yearsLabel, type Birthday } from "../lib/birthdays";

// „dziś" / „jutro" / „za 5 dni" — licznik jest tu ważniejszy niż sama data,
// bo lista i tak stoi w kolejności od najbliższych.
function untilLabel(days: number): string {
  if (days === 0) return "dziś";
  if (days === 1) return "jutro";
  return `za ${days} dni`;
}

export function BirthdayRow({
  birthday,
  now,
  onEdit,
  onDelete,
}: {
  birthday: Birthday;
  now: Date;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const days = daysUntil(birthday, now);
  const age = turningAge(birthday, now);
  const isToday = days === 0;

  return (
    <li
      className={`flex items-center gap-3 rounded-[14px] border px-3 py-2.5 ${
        isToday
          ? "border-accent/50 bg-[rgb(150_124_255_/_0.10)]"
          : "border-card-border bg-card"
      }`}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isToday ? "accent-gradient text-white" : "bg-white/[0.06] text-subtle"
          }`}
        >
          {birthday.day}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{birthday.name}</span>
          <span className="block text-xs text-muted">
            {untilLabel(days)}
            {age !== null && ` · kończy ${age} ${yearsLabel(age)}`}
          </span>
        </span>
      </button>

      <ConfirmDeleteButton onDelete={onDelete} label={`Usuń urodziny: ${birthday.name}`} />
    </li>
  );
}
