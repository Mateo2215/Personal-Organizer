// Powłoka apki: nagłówek (tytuł ekranu + akcje) + treść zakładki (Outlet) + dolna nawigacja.

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ArrowDownToLine, LogOut } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { clearToken } from "../lib/token";
import { downloadExport } from "../lib/export";

// Tytuł nagłówka zależny od aktywnego ekranu (wg specyfikacji App Header).
const TITLES: Record<string, string> = {
  "/": "Personal Organizer",
  "/tasks": "Zadania",
  "/ideas": "Pomysły",
};

export function Layout() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Personal Organizer";

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
      <header className="flex items-center justify-between px-5 pb-3 pt-1.5">
        <h1 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            disabled={isExporting}
            aria-label="Eksportuj dane"
            title="Eksportuj dane"
            className="-m-1 p-2 text-muted transition-colors hover:text-accent disabled:opacity-40"
          >
            <ArrowDownToLine size={19} strokeWidth={2} />
          </button>
          <button
            onClick={logout}
            aria-label="Wyloguj"
            title="Wyloguj"
            className="-m-1 p-2 text-muted transition-colors hover:text-accent"
          >
            <LogOut size={19} strokeWidth={2} />
          </button>
        </div>
      </header>
      {exportError && <p className="px-5 pb-1 text-xs text-alarm-text">{exportError}</p>}
      <main className="flex-1 px-[18px] pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
