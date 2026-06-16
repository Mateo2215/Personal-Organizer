// Korzeń aplikacji. Faza 1: bramka klucza + zadania + włączanie/test powiadomień push.
// Pełne zakładki (Dziś / Zadania / Pomysły) dochodzą w Fazach 2–3.

import { useState } from "react";
import { AccessGate } from "./components/AccessGate";
import { getToken, clearToken } from "./lib/token";
import { api } from "./lib/api";
import { enablePush, notificationsGranted } from "./lib/push";
import { Tasks } from "./features/Tasks";

function Home({ onLock }: { onLock: () => void }) {
  const [pushMsg, setPushMsg] = useState<string | null>(
    notificationsGranted() ? "Powiadomienia włączone." : null,
  );
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function onEnablePush() {
    setPushMsg("Włączam…");
    const res = await enablePush();
    setPushMsg(res.ok ? "Powiadomienia włączone." : `Nie włączono: ${res.reason}`);
  }

  async function onTestPush() {
    setTestMsg("Wysyłam…");
    try {
      const r = await api<{ sent: number; statuses: number[] }>("/api/_dev/test-push", {
        method: "POST",
      });
      setTestMsg(`Wysłano do ${r.sent} subskrypcji (statusy: ${r.statuses.join(", ") || "brak"}).`);
    } catch {
      setTestMsg("Błąd wysyłki testowej.");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Personal Organizer</h1>
        <button onClick={onLock} className="text-xs text-neutral-500 hover:text-neutral-300">
          Wyloguj
        </button>
      </header>

      <section className="space-y-2 rounded-lg border border-neutral-800 p-3">
        <div className="flex gap-2">
          <button onClick={onEnablePush} className="rounded-lg bg-neutral-800 px-3 py-2 text-sm">
            Włącz powiadomienia
          </button>
          <button onClick={onTestPush} className="rounded-lg bg-neutral-800 px-3 py-2 text-sm">
            Test push
          </button>
        </div>
        {pushMsg && <p className="text-xs text-neutral-400">{pushMsg}</p>}
        {testMsg && <p className="text-xs text-neutral-400">{testMsg}</p>}
      </section>

      <Tasks />
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
