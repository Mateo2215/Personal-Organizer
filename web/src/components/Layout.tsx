// Powłoka apki: nagłówek (logo + tytuł ekranu + wejście do Ustawień) + treść zakładki (Outlet) + dolna nawigacja.

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { AppIcon } from "./Logo";

// Tytuł nagłówka zależny od aktywnego ekranu (wg specyfikacji App Header).
const TITLES: Record<string, string> = {
  "/": "Personal Organizer",
  "/tasks": "Zadania",
  "/ideas": "Pomysły",
  "/settings": "Ustawienia",
};

export function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = TITLES[pathname] ?? "Personal Organizer";
  const isSettings = pathname === "/settings";

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-1.5">
        <div className="flex items-center gap-2.5">
          <AppIcon size={28} glow={false} />
          <h1 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        </div>

        {/* Wejście do Ustawień (eksport, wylogowanie, personalizacja); na samym ekranie Ustawień — powrót. */}
        {isSettings ? (
          <button
            onClick={() => navigate(-1)}
            aria-label="Wstecz"
            className="-m-1 p-2 text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={() => navigate("/settings")}
            aria-label="Ustawienia"
            className="-m-1 p-2 text-muted transition-colors hover:text-accent"
          >
            <SettingsIcon size={20} strokeWidth={2} />
          </button>
        )}
      </header>
      <main className="flex-1 px-[18px] pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
