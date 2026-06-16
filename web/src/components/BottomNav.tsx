// Dolny pasek nawigacji (3 zakładki, kciukiem pod telefon).

import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Dziś", end: true },
  { to: "/tasks", label: "Zadania", end: false },
  { to: "/ideas", label: "Pomysły", end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-sm font-medium ${
              isActive ? "text-indigo-400" : "text-neutral-500"
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
