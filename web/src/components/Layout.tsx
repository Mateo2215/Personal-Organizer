// Powłoka apki: nagłówek (logo + tytuł ekranu + menu) + treść zakładki (Outlet) + dolna nawigacja.

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ArrowDownToLine, LogOut, MoreVertical } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { AppIcon } from "./Logo";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Personal Organizer";

  function logout() {
    clearToken();
    location.reload(); // przeładowanie pokaże ekran klucza (getToken() = null)
  }

  async function onExport() {
    setMenuOpen(false);
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
        <div className="flex items-center gap-2.5">
          <AppIcon size={28} glow={false} />
          <h1 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        </div>

        {/* Menu (⋮): rzadkie akcje (eksport, wylogowanie) schowane poza główny widok. */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="-m-1 p-2 text-muted transition-colors hover:text-accent"
          >
            <MoreVertical size={20} strokeWidth={2} />
          </button>

          {menuOpen && (
            <>
              {/* Tło zamykające menu po kliknięciu poza nim. */}
              <button
                aria-hidden
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-[14px] border border-card-border bg-base/95 p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0_/_0.6)] backdrop-blur-xl">
                <button
                  onClick={onExport}
                  disabled={isExporting}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                >
                  <ArrowDownToLine size={17} strokeWidth={2} className="text-muted" />
                  {isExporting ? "Eksportuję…" : "Eksportuj dane"}
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-white/[0.06]"
                >
                  <LogOut size={17} strokeWidth={2} className="text-muted" />
                  Wyloguj
                </button>
              </div>
            </>
          )}
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
