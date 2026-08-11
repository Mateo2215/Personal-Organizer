// Model urodzin + funkcje API i pomocniki dat po stronie frontu.
// Rocznica nie niesie roku, więc "kiedy najbliższe" liczymy zawsze względem dzisiejszej daty
// LOKALNEJ — data, która w tym roku już minęła, należy do przyszłego roku.
// Reguła 29 lutego jest tu świadomie taka sama jak w cronie workera (w latach nieprzestępnych
// świętujemy 28.02) — inaczej lista pokazywałaby co innego niż wysyła powiadomienie.

import { api } from "./api";

export interface Birthday {
  id: number;
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  birth_year: number | null; // null = rocznik nieznany
  last_notified_year: number | null;
  created_at: string;
}

export interface NewBirthday {
  name: string;
  month: number;
  day: number;
  birth_year: number | null;
}

export type BirthdayPatch = Partial<NewBirthday>;

export const listBirthdays = () => api<Birthday[]>("/api/birthdays");

export const addBirthday = (input: NewBirthday) =>
  api<Birthday>("/api/birthdays", { method: "POST", body: JSON.stringify(input) });

export const patchBirthday = (id: number, patch: BirthdayPatch) =>
  api<Birthday>(`/api/birthdays/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteBirthday = (id: number) =>
  api<void>(`/api/birthdays/${id}`, { method: "DELETE" });

export const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const MONTHS_GENITIVE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month: number): number {
  return DAYS_IN_MONTH[month - 1] ?? 31;
}

export function formatBirthdayDate(birthday: { month: number; day: number }): string {
  return `${birthday.day} ${MONTHS_GENITIVE[birthday.month - 1]}`;
}

// Północ dnia lokalnego — punkt odniesienia dla wszystkich porównań.
function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Data obchodów w danym roku. 29 lutego w roku nieprzestępnym spada na 28.02.
function celebrationDate(year: number, birthday: { month: number; day: number }): Date {
  if (birthday.month === 2 && birthday.day === 29 && !isLeapYear(year)) {
    return new Date(year, 1, 28);
  }
  return new Date(year, birthday.month - 1, birthday.day);
}

// Ile dni do najbliższych obchodów: 0 = dziś, 1 = jutro. Data minęła → liczymy do przyszłego roku.
export function daysUntil(birthday: { month: number; day: number }, now: Date = new Date()): number {
  const today = startOfLocalDay(now);
  let next = celebrationDate(today.getFullYear(), birthday);
  if (next < today) next = celebrationDate(today.getFullYear() + 1, birthday);
  // Zaokrąglenie chroni przed zmianą czasu, która psuje dzielenie przez pełną dobę.
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function isBirthdayToday(birthday: { month: number; day: number }, now: Date = new Date()): boolean {
  return daysUntil(birthday, now) === 0;
}

// Wiek kończony przy NAJBLIŻSZYCH obchodach. Bez rocznika — null.
// Gdy tegoroczna data już minęła, liczymy wiek na obchody w przyszłym roku (spójnie z sortowaniem).
export function turningAge(birthday: Birthday, now: Date = new Date()): number | null {
  if (birthday.birth_year === null) return null;
  const today = startOfLocalDay(now);
  const thisYear = today.getFullYear();
  const celebrationYear = celebrationDate(thisYear, birthday) < today ? thisYear + 1 : thisYear;
  const age = celebrationYear - birthday.birth_year;
  return age > 0 ? age : null;
}

// Polska odmiana: 1 rok, 2-4 lata, 5+ lat — z wyjątkiem nastek (12-14 lat).
export function yearsLabel(age: number): string {
  if (age === 1) return "rok";
  const lastTwo = age % 100;
  const last = age % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return "lata";
  return "lat";
}

// Lista od najbliższych obchodów. Zachowanie stabilne: przy tym samym dniu decyduje imię.
export function sortByUpcoming(birthdays: Birthday[], now: Date = new Date()): Birthday[] {
  return [...birthdays].sort((a, b) => {
    const diff = daysUntil(a, now) - daysUntil(b, now);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "pl");
  });
}

export interface MonthGroup {
  month: number;
  label: string;
  birthdays: Birthday[];
}

// Grupuje posortowaną listę w sekcje miesięcy, NIE zmieniając kolejności —
// dzięki temu pierwszy nagłówek to bieżący miesiąc, a nie styczeń.
export function groupByMonth(birthdays: Birthday[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const birthday of birthdays) {
    const last = groups[groups.length - 1];
    if (last && last.month === birthday.month) {
      last.birthdays.push(birthday);
    } else {
      groups.push({ month: birthday.month, label: MONTHS[birthday.month - 1], birthdays: [birthday] });
    }
  }
  return groups;
}
