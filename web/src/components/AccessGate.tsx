// Ekran „klucza dostępu" — pokazywany, gdy w przeglądarce nie ma jeszcze tokenu.
// Sprawdza token wołając /api/health; przy poprawnym zapisuje go i wpuszcza dalej.

import { useState } from "react";
import { Lock } from "lucide-react";
import { AppIcon } from "./Logo";
import { setToken, clearToken } from "../lib/token";

export function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setToken(value.trim());
    try {
      const res = await fetch("/api/health", {
        headers: { Authorization: `Bearer ${value.trim()}` },
      });
      if (!res.ok) throw new Error();
      onUnlock();
    } catch {
      clearToken();
      setError("Niepoprawny klucz albo serwer nieosiągalny.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-[34px]">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-[26px]">
          <AppIcon size={66} />
        </div>

        <h1 className="font-display text-[25px] font-semibold tracking-[-0.02em] text-ink">
          Personal Organizer
        </h1>
        <p className="mt-1 mb-7 text-sm text-muted">Wpisz klucz dostępu, aby wejść.</p>

        <div className="relative w-full">
          <Lock
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Klucz dostępu"
            className="w-full rounded-[15px] border border-white/10 bg-white/[0.05] py-[15px] pl-11 pr-4 text-base tracking-[0.1em] text-ink placeholder:tracking-normal placeholder:text-placeholder outline-none transition-colors focus:border-accent/60"
          />
        </div>

        {error && <p className="mt-3 self-start text-sm text-alarm-text">{error}</p>}

        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="accent-gradient accent-glow mt-4 w-full rounded-[15px] py-[15px] text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
        >
          {busy ? "Sprawdzam…" : "Wejdź"}
        </button>
      </form>
    </div>
  );
}
