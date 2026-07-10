// Model zadania + funkcje API. Czas trzymany w UTC; front konwertuje do/z czasu lokalnego.

import { api } from "./api";

// Wyprzedzenie przypomnienia: 0 = o terminie, inaczej tyle minut przed terminem.
export type ReminderOffset = 0 | 15 | 30 | 60;

export const REMINDER_OFFSETS: { value: ReminderOffset; label: string }[] = [
  { value: 0, label: "O terminie" },
  { value: 15, label: "15 min wcześniej" },
  { value: 30, label: "30 min wcześniej" },
  { value: 60, label: "1 godz. wcześniej" },
];

export interface Task {
  id: number;
  content: string;
  due_at: string | null; // ISO UTC lub null
  has_time: number; // 1 = ma godzinę, 0 = tylko dzień / brak terminu
  status: "open" | "done";
  reminded_at: string | null;
  reminder_offset_minutes: number; // 0 | 15 | 30 | 60
  created_at: string;
  updated_at: string;
}

export interface NewTask {
  content: string;
  due_at: string | null;
  has_time: boolean;
  reminder_offset_minutes: ReminderOffset;
}

// Pola edytowalne zadania (edycja treści/terminu z UI).
export type TaskPatch = Partial<{
  content: string;
  due_at: string | null;
  has_time: boolean;
  status: "open" | "done";
  reminder_offset_minutes: ReminderOffset;
}>;

export const listTasks = () => api<Task[]>("/api/tasks");

export const addTask = (input: NewTask) =>
  api<Task>("/api/tasks", { method: "POST", body: JSON.stringify(input) });

export const patchTask = (id: number, patch: TaskPatch) =>
  api<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteTask = (id: number) =>
  api<void>(`/api/tasks/${id}`, { method: "DELETE" });

export const deleteCompletedTasks = () =>
  api<void>("/api/tasks/completed", { method: "DELETE" });

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

// ISO UTC → termin zadania z krótkim dniem tygodnia, np. „pon., 13.07, 14:00”.
// Osobny formatter zachowuje dotychczasowy, neutralny format dat dla pozostałych rekordów.
export function formatTaskDue(iso: string | null): string {
  if (!iso) return "bez terminu";
  return new Date(iso).toLocaleString("pl-PL", {
    weekday: "short",
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

// Nadchodzące: termin w przyszłych dniach (od jutra w górę; czas lokalny urządzenia).
export function isUpcoming(t: Task): boolean {
  if (!t.due_at) return false;
  const due = new Date(t.due_at);
  const startTomorrow = new Date();
  startTomorrow.setHours(0, 0, 0, 0);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  return due >= startTomorrow;
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

// Zaplanowane od dziś w górę: zadanie z terminem nie wcześniejszym niż początek dzisiejszego dnia
// (czas lokalny). Filtr agendy kalendarza — wszystkie przyszłe bez limitu, łącznie z dzisiejszymi.
export function isScheduledFromToday(t: Task): boolean {
  if (!t.due_at) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return new Date(t.due_at).getTime() >= start.getTime();
}

// ISO UTC → klucz dnia lokalnego "YYYY-MM-DD" (do grupowania agendy po dacie).
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ISO UTC → sama godzina lokalna "HH:mm" (data jest w nagłówku sekcji agendy).
export function formatTimeLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

// Krótka etykieta ustawionego wyprzedzenia (np. „15 min wcześniej"); null dla „o terminie".
export function offsetLabel(offset: number): string | null {
  const found = REMINDER_OFFSETS.find((o) => o.value === offset);
  return found && found.value !== 0 ? found.label : null;
}

// Czas względny do terminu liczony od `now` (ms): „za 2 godz." / „15 min temu" / „teraz".
// `now` podajemy z zegara widoku (useMinuteNow), żeby licznik odświeżał się bez requestów.
export function formatRelativeToDue(dueIso: string, now: number): string {
  const diffMs = new Date(dueIso).getTime() - now;
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  if (absMin < 1) return "teraz";

  let unit: string;
  if (absMin < 60) {
    unit = `${absMin} min`;
  } else if (absMin < 60 * 24) {
    unit = `${Math.floor(absMin / 60)} godz.`;
  } else {
    const days = Math.floor(absMin / (60 * 24));
    unit = days === 1 ? "1 dzień" : `${days} dni`;
  }
  return diffMs < 0 ? `${unit} temu` : `za ${unit}`;
}
