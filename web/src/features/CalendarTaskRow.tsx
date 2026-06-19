// Wiersz zadania w agendzie kalendarza: checkbox (toggle done) + godzina + treść.
// Świadomie lekki — bez edycji i usuwania (te żyją w „Zadania"); kalendarz to podgląd + odhaczanie.

import { Check, Clock } from "lucide-react";
import { formatRelativeToDue, formatTimeLocal, offsetLabel, type Task } from "../lib/tasks";

export function CalendarTaskRow({
  task,
  now,
  onToggle,
}: {
  task: Task;
  now: number;
  onToggle: () => void;
}) {
  const done = task.status === "done";
  const hasTime = !!task.has_time;
  const reminderLabel = offsetLabel(task.reminder_offset_minutes);
  const showCountdown = !done && !!task.due_at;

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

      {/* Godzina (stała szerokość, by treść równała się w kolumnie). „Cały dzień" gdy bez godziny. */}
      <span
        className={`shrink-0 text-[12.5px] font-semibold tabular-nums ${
          done ? "text-faint" : "text-accent"
        }`}
      >
        {hasTime ? (
          formatTimeLocal(task.due_at!)
        ) : (
          <span className="flex items-center gap-1 text-faint">
            <Clock size={12} strokeWidth={2} />
            cały dzień
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14.5px] ${done ? "text-[#8a8699] line-through" : "text-ink"}`}>
          {task.content}
        </p>
        {(showCountdown || reminderLabel) && (
          <p className="mt-0.5 text-[11px] text-faint">
            {showCountdown && formatRelativeToDue(task.due_at!, now)}
            {reminderLabel && `${showCountdown ? " · " : ""}${reminderLabel}`}
          </p>
        )}
      </div>
    </li>
  );
}
