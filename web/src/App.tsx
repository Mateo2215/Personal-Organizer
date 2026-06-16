// Korzeń aplikacji. Faza 0: bramka klucza + minimalny widok sprawdzający połączenie z Workerem.
// Pełne zakładki (Dziś / Zadania / Pomysły) dochodzą w Fazach 1–3.

import { useEffect, useState } from "react";
import { AccessGate } from "./components/AccessGate";
import { getToken, clearToken } from "./lib/token";
import { api } from "./lib/api";

function Home({ onLock }: { onLock: () => void }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    api<{ ok: boolean }>("/api/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Personal Organizer</h1>
      <p className="text-sm text-neutral-400">
        {status === "loading" && "Łączę z serwerem…"}
        {status === "ok" && "✓ Połączono z API (Faza 0 działa)."}
        {status === "error" && "✗ Brak połączenia z API."}
      </p>
      <button
        onClick={onLock}
        className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-400"
      >
        Wyloguj (wyczyść klucz)
      </button>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(!!getToken());

  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />;
  return (
    <Home
      onLock={() => {
        clearToken();
        setUnlocked(false);
      }}
    />
  );
}
