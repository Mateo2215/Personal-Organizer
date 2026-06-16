// Powłoka apki: nagłówek + treść zakładki (Outlet) + dolna nawigacja.

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { clearToken } from "../lib/token";
import { downloadExport } from "../lib/export";

export function Layout() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function logout() {
    clearToken();
    location.reload(); // przeładowanie pokaże ekran klucza (getToken() = null)
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

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">Personal Organizer</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            disabled={isExporting}
            className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
          >
            {isExporting ? "Eksportuję…" : "Eksportuj"}
          </button>
          <button onClick={logout} className="text-xs text-neutral-500 hover:text-neutral-300">
            Wyloguj
          </button>
        </div>
      </header>
      {exportError && (
        <p className="px-4 pb-1 text-xs text-red-400">{exportError}</p>
      )}
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
