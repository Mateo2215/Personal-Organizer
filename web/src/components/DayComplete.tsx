// Karta gratulacji na „Dziś": pokazywana, gdy cały dzienny plan
// (zadania z terminem na dziś + rutyny) jest odhaczony. Front-only, spójna z Aurorą.

import { PartyPopper } from "lucide-react";

export function DayComplete({ hasOverdue }: { hasOverdue: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-card-border bg-card px-6 py-9 text-center">
      <div
        className="logo-glow mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgb(150 124 255 / 0.4), rgb(150 124 255 / 0.06))",
        }}
      >
        <PartyPopper size={34} strokeWidth={1.8} className="text-[#cdc2ff]" />
      </div>
      <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
        Dzień zaliczony 🎉
      </h3>
      <p className="mx-auto mt-2 max-w-[18rem] text-sm text-muted" style={{ textWrap: "pretty" }}>
        {hasOverdue
          ? "Plan na dziś odhaczony w całości. Zostały jeszcze zaległe niżej."
          : "Wszystko na dziś zrobione. Odpocznij albo złap pomysł na jutro."}
      </p>
    </div>
  );
}
