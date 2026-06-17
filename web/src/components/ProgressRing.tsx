// Pierścień postępu dnia: zrobione/total z dzisiejszych zadań. Łuk animowany przez stroke-dashoffset.

export function ProgressRing({ done, total, size = 50 }: { done: number; total: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? done / total : 0;
  const offset = c * (1 - ratio);
  const center = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#9a86ff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-extrabold text-ink">
        {done}/{total}
      </span>
    </div>
  );
}
