// Reużywalny stan pusty: aura-ikona + tytuł + opis + opcjonalne przyciski akcji.

import type { LucideIcon } from "lucide-react";

type Action = { label: string; onClick: () => void; variant?: "primary" | "secondary" };

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: Action[];
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div
        className="logo-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgb(150 124 255 / 0.35), rgb(150 124 255 / 0.06))",
        }}
      >
        <Icon size={36} strokeWidth={1.8} className="text-[#cdc2ff]" />
      </div>
      <h3 className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-2 max-w-[18rem] text-sm text-muted" style={{ textWrap: "pretty" }}>
        {description}
      </p>
      {actions.length > 0 && (
        <div className="mt-6 flex w-full max-w-[18rem] flex-col gap-2.5">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={
                a.variant === "secondary"
                  ? "w-full rounded-[15px] border border-white/[0.12] bg-white/[0.04] py-3 text-sm font-bold text-[#cdc9dd] transition-colors hover:bg-white/[0.08]"
                  : "accent-gradient accent-glow w-full rounded-[15px] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
