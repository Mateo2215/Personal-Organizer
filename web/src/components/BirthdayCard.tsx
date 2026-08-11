// Karta urodzin na „Dziś". Świadomie zwięzła i pozioma — pojawia się NAD resztą dnia,
// więc nie może zjadać ekranu tak jak pełnowymiarowa karta „Dzień zaliczony".

import { Cake } from "lucide-react";
import { turningAge, yearsLabel, type Birthday } from "../lib/birthdays";

function line(birthday: Birthday, now: Date): string {
  const age = turningAge(birthday, now);
  return age === null ? birthday.name : `${birthday.name} — ${age} ${yearsLabel(age)}`;
}

export function BirthdayCard({ birthdays, now }: { birthdays: Birthday[]; now: Date }) {
  const many = birthdays.length > 1;

  return (
    <div className="flex items-center gap-3.5 rounded-[16px] border border-accent/45 bg-[rgb(150_124_255_/_0.10)] px-4 py-3.5">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgb(150 124 255 / 0.45), rgb(150 124 255 / 0.08))",
        }}
      >
        <Cake size={22} strokeWidth={1.9} className="text-[#cdc2ff]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Dziś urodziny</p>
        <p className="mt-0.5 text-sm font-semibold text-ink" style={{ textWrap: "pretty" }}>
          {birthdays.map((birthday) => line(birthday, now)).join(" · ")}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {many ? "Nie zapomnij złożyć życzeń." : "Nie zapomnij złożyć życzeń 🎉"}
        </p>
      </div>
    </div>
  );
}
