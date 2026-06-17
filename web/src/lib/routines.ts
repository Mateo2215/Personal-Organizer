// Model rutyny (codzienne zadanie bez godziny) + funkcje API.
// "Zrobione dziś" liczymy lokalnie: last_done_on (data 'YYYY-MM-DD') == dzisiejsza data lokalna.
// Reset dzienny jest automatyczny — gdy zmienia się dzień, wczorajsza data przestaje być dzisiejsza.

import { api } from "./api";

export interface Routine {
  id: number;
  content: string;
  last_done_on: string | null; // lokalna data 'YYYY-MM-DD' ostatniego odhaczenia; null = nigdy
  created_at: string;
}

export interface NewRoutine {
  content: string;
}

// Pola edytowalne rutyny: rename (content) + odhaczenie/odznaczenie (last_done_on).
export type RoutinePatch = Partial<{
  content: string;
  last_done_on: string | null;
}>;

export const listRoutines = () => api<Routine[]>("/api/routines");

export const addRoutine = (input: NewRoutine) =>
  api<Routine>("/api/routines", { method: "POST", body: JSON.stringify(input) });

export const patchRoutine = (id: number, patch: RoutinePatch) =>
  api<Routine>(`/api/routines/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteRoutine = (id: number) =>
  api<void>(`/api/routines/${id}`, { method: "DELETE" });

// Dzisiejsza data w czasie LOKALNYM jako 'YYYY-MM-DD'.
// Świadomie NIE używamy toISOString().slice(0,10) — to data UTC i myliłaby granicę dnia.
export function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Czy rutyna jest odhaczona DZIŚ (lokalnie).
export function isDoneToday(r: Routine): boolean {
  return r.last_done_on === todayLocalDate();
}
