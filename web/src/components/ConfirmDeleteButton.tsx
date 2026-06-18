// Przycisk usuwania z potwierdzeniem inline (dwukrok): pierwszy tap zamienia ikonę X
// na „Usunąć? Tak · Nie" w tym samym wierszu. Chroni przed przypadkowym skasowaniem na telefonie.
// Po kilku sekundach bez decyzji potwierdzenie samo znika (powrót do ikony).

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const AUTO_CANCEL_MS = 3500;

export function ConfirmDeleteButton({
  onDelete,
  label,
  size = 15,
}: {
  onDelete: () => void;
  label: string; // aria-label ikony, np. „Usuń zadanie"
  size?: number;
}) {
  const [confirming, setConfirming] = useState(false);

  // Brak decyzji = ciche anulowanie, żeby wiersz nie został „uzbrojony" w nieskończoność.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), AUTO_CANCEL_MS);
    return () => clearTimeout(t);
  }, [confirming]);

  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold">
        <span className="text-muted">Usunąć?</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-alarm-text transition-colors hover:text-alarm"
        >
          Tak
        </button>
        <span className="text-faint" aria-hidden>·</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-muted transition-colors hover:text-ink"
        >
          Nie
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="shrink-0 text-faint transition-colors hover:text-alarm"
      aria-label={label}
    >
      <X size={size} strokeWidth={2} />
    </button>
  );
}
