// Zbiorcze usuwanie wykonanych zadań z potwierdzeniem inline i obsługą błędu.

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

const AUTO_CANCEL_MS = 3500;

export function ClearCompletedButton({
  count,
  isPending,
  isError,
  onConfirm,
  onReset,
}: {
  count: number;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => Promise<void>;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming || isPending) return;
    const timeout = setTimeout(() => {
      setConfirming(false);
      onReset();
    }, AUTO_CANCEL_MS);
    return () => clearTimeout(timeout);
  }, [confirming, isPending, isError, onReset]);

  if (count === 0) return null;

  async function handleConfirm() {
    try {
      await onConfirm();
      setConfirming(false);
    } catch {
      // Stan błędu pochodzi z mutacji; potwierdzenie zostaje widoczne, aby umożliwić ponowienie.
    }
  }

  if (confirming) {
    return (
      <div className="space-y-2 rounded-[14px] border border-alarm/25 bg-alarm/5 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] font-semibold">
          <span className="text-muted">Na pewno usunąć {count}?</span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-md px-1 text-alarm-text transition-colors hover:text-alarm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alarm disabled:opacity-50"
          >
            {isPending ? "Usuwam…" : "Tak"}
          </button>
          <span className="text-faint" aria-hidden>·</span>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              onReset();
            }}
            disabled={isPending}
            className="rounded-md px-1 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            Nie
          </button>
        </div>
        {isError && (
          <p className="text-center text-xs text-alarm-text" role="alert">
            Nie udało się usunąć zadań. Spróbuj ponownie.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onReset();
        setConfirming(true);
      }}
      className="mx-auto flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-sm font-semibold text-faint transition-colors hover:bg-alarm/5 hover:text-alarm-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alarm"
      aria-label={`Usuń wszystkie wykonane zadania (${count})`}
    >
      <Trash2 size={15} strokeWidth={2} />
      Usuń wykonane ({count})
    </button>
  );
}
