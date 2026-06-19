// Kompaktowy pasek tygodnia nad agendą kalendarza: 7 dni (Pn–Nd), kropka na dniach z zadaniami,
// dziś podświetlone, strzałki ‹ › zmieniają tydzień. Tap w dzień filtruje agendę do tego dnia
// (ponowny tap = pokaż wszystkie). Czysto prezentacyjny — dane wejściowe dostaje z Calendar.

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Poniedziałek tygodnia, w którym leży `d` (lokalnie, 00:00).
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0 = poniedziałek
  x.setDate(x.getDate() - dow);
  return x;
}

export function WeekStrip({
  busyDays,
  selected,
  onSelect,
}: {
  busyDays: Set<string>;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const todayKey = keyOf(new Date());

  // Poniedziałek wyświetlanego tygodnia (bieżący + przesunięcie) i jego 7 dni.
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const ma = days[0].toLocaleDateString("pl-PL", { month: "long" });
  const mb = days[6].toLocaleDateString("pl-PL", { month: "long" });
  const label =
    ma === mb ? `${cap(ma)} ${days[6].getFullYear()}` : `${cap(ma)} – ${cap(mb)} ${days[6].getFullYear()}`;

  return (
    <div className="rounded-[18px] border border-card-border bg-white/[0.025] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Poprzedni tydzień"
          className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <p className="text-[12.5px] font-semibold text-subtle">{label}</p>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Następny tydzień"
          className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const key = keyOf(d);
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const isPast = key < todayKey; // porównanie "YYYY-MM-DD" działa leksykograficznie
          const busy = busyDays.has(key);
          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(isSelected ? null : key)}
              className={`flex flex-col items-center gap-0.5 rounded-[12px] py-1.5 transition-colors ${
                isSelected
                  ? "accent-gradient text-white"
                  : isPast
                    ? "cursor-default text-faint/50"
                    : "text-subtle hover:bg-white/[0.06]"
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isSelected ? "text-white/80" : "text-faint"}`}>
                {WEEKDAYS[i]}
              </span>
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold ${
                  isToday && !isSelected ? "text-accent ring-1 ring-accent" : ""
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${busy ? (isSelected ? "bg-white" : "bg-accent") : "bg-transparent"}`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
