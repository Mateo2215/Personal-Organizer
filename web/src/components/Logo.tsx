// Logo „Postęp": pierścień postępu + odhaczenie. Znak (LogoMark) sterowany currentColor,
// kafelek ikony aplikacji (AppIcon) z gradientem akcentu. Źródło: design/logo/README.md.

type LogoMarkProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function LogoMark({ className, style }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Pierścień postępu (~76% obwodu, przerwa u góry) */}
      <circle cx="12" cy="12" r="9" strokeDasharray="46 60" transform="rotate(-90 12 12)" />
      {/* Odhaczenie wewnątrz pierścienia */}
      <path d="m8.4 12.4 2.5 2.5 4.7-5.4" />
    </svg>
  );
}

// Kafelek ikony aplikacji: squircle z gradientem akcentu + biały znak w środku.
// Promień rogów = 0.3125 × bok (proporcja z designu).
export function AppIcon({ size = 64, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: size * 0.3125 }}
      className={`accent-gradient flex items-center justify-center ${glow ? "logo-glow" : ""}`}
    >
      <LogoMark className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
