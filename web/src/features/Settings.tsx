// Ekran „Ustawienia": personalizacja (imię), dane (eksport), konto (wyloguj).
// Imię trzymane lokalnie (per urządzenie). Eksport i Wyloguj przeniesione tu z menu ⋮ nagłówka.

import { useState } from "react";
import { UserRound, ArrowDownToLine, LogOut } from "lucide-react";
import { getName, setName } from "../lib/settings";
import { downloadExport } from "../lib/export";
import { clearToken } from "../lib/token";

export function Settings() {
  const [name, setNameState] = useState(getName());
  const [saved, setSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function onNameChange(value: string) {
    setNameState(value);
    setName(value); // zapis na bieżąco; powitanie odświeży się przy następnym wejściu na „Dziś"
    setSaved(true);
  }

  async function onExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadExport();
    } catch {
      setExportError("Nie udało się pobrać eksportu.");
    } finally {
      setIsExporting(false);
    }
  }

  function logout() {
    clearToken();
    location.reload(); // przeładowanie pokaże ekran klucza (getToken() = null)
  }

  return (
    <div className="space-y-5">
      {/* Personalizacja */}
      <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
        <div className="flex items-center gap-2">
          <UserRound size={15} strokeWidth={2.5} className="text-accent" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Personalizacja</h2>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm text-subtle">Twoje imię</span>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="np. Mateusz"
            className="w-full rounded-[12px] border border-card-border bg-field px-3 py-2.5 text-sm text-ink placeholder:text-placeholder outline-none focus:border-accent/60"
          />
        </label>
        <p className="text-xs text-faint">
          {saved && name.trim()
            ? `Powitanie na ekranie Dziś: Dzień dobry, ${name.trim()} 👋`
            : "Pojawi się w powitaniu na ekranie Dziś. Zapisane tylko na tym urządzeniu."}
        </p>
      </section>

      {/* Dane */}
      <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Dane</h2>
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-card-border bg-white/[0.04] px-3.5 py-3 text-left text-sm text-ink transition-colors hover:bg-white/[0.07] disabled:opacity-40"
        >
          <ArrowDownToLine size={17} strokeWidth={2} className="text-muted" />
          {isExporting ? "Eksportuję…" : "Eksportuj dane (JSON)"}
        </button>
        {exportError && <p className="text-xs text-alarm-text">{exportError}</p>}
      </section>

      {/* Konto */}
      <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Konto</h2>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-card-border bg-white/[0.04] px-3.5 py-3 text-left text-sm text-ink transition-colors hover:bg-white/[0.07]"
        >
          <LogOut size={17} strokeWidth={2} className="text-muted" />
          Wyloguj
        </button>
      </section>
    </div>
  );
}
