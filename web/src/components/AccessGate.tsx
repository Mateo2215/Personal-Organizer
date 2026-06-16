// Ekran „klucza dostępu" — pokazywany, gdy w przeglądarce nie ma jeszcze tokenu.
// Sprawdza token wołając /api/health; przy poprawnym zapisuje go i wpuszcza dalej.

import { useState } from "react";
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
    <div className="flex min-h-full items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Personal Organizer</h1>
          <p className="text-sm text-neutral-400">Wpisz klucz dostępu, aby wejść.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Klucz dostępu"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-base outline-none focus:border-indigo-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Sprawdzam…" : "Wejdź"}
        </button>
      </form>
    </div>
  );
}
