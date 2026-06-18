// Wybór priorytetu pomysłu: trzy segmenty (niski/średni/wysoki) z kolorową kropką.
// Współdzielony przez przechwyt (IdeaCapture) i edycję (IdeaItem).

import { PRIORITIES, type IdeaPriority } from "../lib/ideas";

export function PriorityPicker({
  value,
  onChange,
}: {
  value: IdeaPriority;
  onChange: (p: IdeaPriority) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Priorytet" className="flex gap-1.5">
      {PRIORITIES.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.value)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
              active ? p.activeClass : "border-card-border text-faint hover:text-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${p.dotClass}`} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
