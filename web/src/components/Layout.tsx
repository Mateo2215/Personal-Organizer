// Powłoka apki: nagłówek + treść zakładki (Outlet) + dolna nawigacja.

import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { clearToken } from "../lib/token";

export function Layout() {
  function logout() {
    clearToken();
    location.reload(); // przeładowanie pokaże ekran klucza (getToken() = null)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">Personal Organizer</h1>
        <button onClick={logout} className="text-xs text-neutral-500 hover:text-neutral-300">
          Wyloguj
        </button>
      </header>
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
