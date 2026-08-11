// Logika urodzin — czysta i testowalna bez runtime Workers (jak scheduler.ts).
// Cron chodzi w UTC, a urodziny są pojęciem LOKALNEJ daty, więc lokalny dzień i godzinę
// liczymy tu jawnie dla stałej strefy (Intl sam ogarnia czas letni/zimowy).

export const BIRTHDAY_TIME_ZONE = "Europe/Warsaw";
// Godzina lokalna, od której wysyłamy powiadomienie. Wcześniej cron w ogóle nie rusza D1.
export const BIRTHDAY_NOTIFY_HOUR = 8;
// Dolna granica sensownego rocznika — chroni przed literówką typu "19" zamiast "1990".
export const MIN_BIRTH_YEAR = 1900;

export interface BirthdayRow {
  id: number;
  name: string;
  month: number;
  day: number;
  birth_year: number | null;
}

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export interface MonthDay {
  month: number;
  day: number;
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Rozbija chwilę na części kalendarza w danej strefie. hourCycle "h23" gwarantuje 0-23
// (bez wariantu "24" o północy, który potrafi wyjść przy hour12: false).
export function localDateParts(
  now: Date,
  timeZone: string = BIRTHDAY_TIME_ZONE,
): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part ? Number(part.value) : 0;
  };

  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour") };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Które pary (miesiąc, dzień) liczą się dziś jako urodziny.
// Zwykle jedna. Wyjątek: 28 lutego w roku nieprzestępnym przejmuje też rocznik 29 lutego —
// bez tego osoba urodzona 29.02 dostawałaby powiadomienie raz na cztery lata.
export function birthdayDayKeys(today: LocalDateParts): MonthDay[] {
  const keys: MonthDay[] = [{ month: today.month, day: today.day }];
  if (today.month === 2 && today.day === 28 && !isLeapYear(today.year)) {
    keys.push({ month: 2, day: 29 });
  }
  return keys;
}

// 29 lutego jest zawsze dozwolone: data urodzin nie niesie roku, więc nie ma czego sprawdzać.
export function isValidMonthDay(month: unknown, day: unknown): boolean {
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) return false;
  if (!Number.isInteger(day) || (day as number) < 1) return false;
  return (day as number) <= DAYS_IN_MONTH[(month as number) - 1];
}

// undefined → null (rocznik nieznany). Wartość spoza zakresu → "invalid" (handler zwraca 400).
export function readBirthYear(
  value: unknown,
  currentYear: number,
): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value)) return "invalid";
  const year = value as number;
  if (year < MIN_BIRTH_YEAR || year > currentYear) return "invalid";
  return year;
}

export function turningAge(birthYear: number | null, currentYear: number): number | null {
  if (birthYear === null) return null;
  const age = currentYear - birthYear;
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

export function birthdayNotification(
  birthday: BirthdayRow,
  currentYear: number,
): { title: string; body: string } {
  const age = turningAge(birthday.birth_year, currentYear);
  return {
    title: "Urodziny 🎂",
    body: age === null
      ? `${birthday.name} ma dziś urodziny`
      : `${birthday.name} kończy dziś ${age} ${yearsLabel(age)}`,
  };
}
