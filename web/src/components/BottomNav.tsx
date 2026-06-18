// Dolny pasek nawigacji (3 zakładki, kciukiem pod telefon). Szklisty (backdrop-blur), z ikonami Lucide.

import { NavLink } from "react-router-dom";
import { Sun, ListChecks, CalendarDays, Lightbulb, type LucideIcon } from "lucide-react";

const tabs: { to: string; label: string; end: boolean; Icon: LucideIcon }[] = [
  { to: "/", label: "Dziś", end: true, Icon: Sun },
  { to: "/tasks", label: "Zadania", end: false, Icon: ListChecks },
  { to: "/calendar", label: "Kalendarz", end: false, Icon: CalendarDays },
  { to: "/ideas", label: "Pomysły", end: false, Icon: Lightbulb },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-card-border bg-base/70 px-2 pt-2.5 backdrop-blur-xl"
      style={{ paddingBottom: "max(22px, env(safe-area-inset-bottom))" }}
    >
      {tabs.map(({ to, label, end, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-1 text-center ${
              isActive ? "font-bold text-accent-bright" : "font-semibold text-faint"
            }`
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span className="text-[11px] leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
