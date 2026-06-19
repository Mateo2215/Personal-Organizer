// Wybór wyprzedzenia przypomnienia: cztery segmenty (o terminie / 15 / 30 / 60 min wcześniej).
// Współdzielony przez composer (Tasks) i edycję (TaskRow); pokazywany tylko, gdy zadanie ma termin z godziną.

import { REMINDER_OFFSETS, type ReminderOffset } from "../lib/tasks";

export function ReminderOffsetPicker({
  value,
  onChange,
}: {
  value: ReminderOffset;
  onChange: (offset: ReminderOffset) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Przypomnienie" className="flex flex-wrap gap-1.5">
      {REMINDER_OFFSETS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-card-border text-faint hover:text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
