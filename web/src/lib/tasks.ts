// Model zadania + funkcje API. Czas trzymany w UTC; front konwertuje do/z czasu lokalnego.

import { api } from "./api";

export interface Task {
  id: number;
  content: string;
  due_at: string | null; // ISO UTC lub null
  has_time: number; // 1 = ma godzinę, 0 = tylko dzień / brak terminu
  status: "open" | "done";
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewTask {
  content: string;
  due_at: string | null;
  has_time: boolean;
}

// Pola edytowalne zadania (edycja treści/terminu z UI).
export type TaskPatch = Partial<{
  content: string;
  due_at: string | null;
  has_time: boolean;
  status: "open" | "done";
}>;

export const listTasks = () => api<Task[]>("/api/tasks");

export const addTask = (input: NewTask) =>
  api<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });

export const patchTask = (
  id: number,
  patch: Partial<{ content: string; due_at: string | null; has_time: boolean; status: "open" | "done" }>,
) => api<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteTask = (id: number) =>
  api<void>(`/api/tasks/${id}`, { method: "DELETE" });

// Wartość z <input type="datetime-local"> (lokalna, bez strefy) → ISO UTC.
export function localInputToUtcIso(value: string): string {
  return new Date(value).toISOString();
}

// ISO UTC → wartość dla <input type="datetime-local"> (lokalny czas, format "YYYY-MM-DDTHH:mm").
export function utcIsoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ISO UTC → czytelny czas lokalny (Europe/Warsaw na urządzeniu użytkownika).
export function formatLocal(iso: string | null): string {
  if (!iso) return "bez terminu";
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Zaległe: otwarte zadanie z terminem, którego czas już minął.
export function isOverdue(t: Task): boolean {
  return t.status === "open" && !!t.due_at && new Date(t.due_at).getTime() < Date.now();
}

// Dzisiejsze: termin wypada w dzisiejszym dniu (czas lokalny urządzenia).
export function isToday(t: Task): boolean {
  if (!t.due_at) return false;
  const due = new Date(t.due_at);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return due >= start && due < end;
}
