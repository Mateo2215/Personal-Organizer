import { describe, expect, it } from "vitest";
import { parseImport } from "../import";

const timestamp = "2026-06-18T18:30:00.000Z";

function currentBackup() {
  return {
    format_version: 2,
    tasks: [{
      id: 1,
      content: "Zadanie",
      due_at: timestamp,
      has_time: 1,
      status: "open",
      reminded_at: null,
      reminder_offset_minutes: 0,
      created_at: timestamp,
      updated_at: timestamp,
    }],
    projects: [{ id: 2, name: "Projekt", created_at: timestamp }],
    ideas: [{
      id: 3,
      content: "Pomysł",
      project_id: 2,
      priority: 3,
      created_at: timestamp,
    }],
    routines: [{
      id: 4,
      content: "Rutyna",
      last_done_on: "2026-06-18",
      created_at: timestamp,
    }],
    // Jawny typ, nie wnioskowany z literału — inaczej dopisanie osoby bez rocznika
    // (birth_year: null) nie przechodzi kontroli typów w testach.
    birthdays: [{
      id: 5,
      name: "Anna",
      month: 3,
      day: 15,
      birth_year: 1990,
      last_notified_year: null,
      created_at: timestamp,
    }] as Array<{
      id: number;
      name: string;
      month: number;
      day: number;
      birth_year: number | null;
      last_notified_year: number | null;
      created_at: string;
    }>,
  };
}

describe("parseImport", () => {
  it("przyjmuje bieżący format i zachowuje dane", () => {
    const result = parseImport(currentBackup());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.format_version).toBe(2);
    expect(result.data.ideas[0].priority).toBe(3);
    expect(result.data.routines).toHaveLength(1);
    expect(result.data.birthdays).toHaveLength(1);
  });

  it("przyjmuje najstarszy eksport bez routines i priority", () => {
    const backup = currentBackup();
    const { format_version: _version, routines: _routines, ...legacy } = backup;
    const legacyIdea = { ...legacy.ideas[0] } as Record<string, unknown>;
    delete legacyIdea.priority;
    legacy.ideas = [legacyIdea as typeof legacy.ideas[number]];

    const result = parseImport(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.routines).toEqual([]);
    expect(result.data.ideas[0].priority).toBe(0);
  });

  it("przyjmuje starszy eksport z routines, ale bez priority", () => {
    const backup = currentBackup();
    const { format_version: _version, ...legacy } = backup;
    const legacyIdea = { ...legacy.ideas[0] } as Record<string, unknown>;
    delete legacyIdea.priority;
    legacy.ideas = [legacyIdea as typeof legacy.ideas[number]];

    const result = parseImport(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.routines).toHaveLength(1);
    expect(result.data.ideas[0].priority).toBe(0);
  });

  it("odrzuca brak wymaganej tablicy", () => {
    const backup = currentBackup() as Record<string, unknown>;
    delete backup.tasks;
    expect(parseImport(backup)).toMatchObject({ ok: false, error: "tasks must be an array" });
  });

  it("odrzuca zły typ pola", () => {
    const backup = currentBackup();
    backup.tasks[0].content = "";
    expect(parseImport(backup)).toMatchObject({ ok: false });
  });

  it("odrzuca nieprawidłowy enum", () => {
    const backup = currentBackup();
    backup.tasks[0].status = "paused" as "open";
    expect(parseImport(backup)).toMatchObject({ ok: false, error: "tasks[0].status is invalid" });
  });

  it("odrzuca duplikaty ID w jednej kolekcji", () => {
    const backup = currentBackup();
    backup.projects.push({ ...backup.projects[0] });
    expect(parseImport(backup)).toMatchObject({ ok: false, error: "projects contains duplicate id 2" });
  });

  it("odrzuca pomysł wskazujący nieistniejący projekt", () => {
    const backup = currentBackup();
    backup.ideas[0].project_id = 999;
    expect(parseImport(backup)).toMatchObject({
      ok: false,
      error: "ideas[0].project_id references a missing project",
    });
  });

  it("odrzuca śmieci zamiast JSON", () => {
    expect(parseImport("{to nie json")).toEqual({ ok: false, error: "invalid JSON" });
  });

  it("odrzuca nieznaną przyszłą wersję", () => {
    const backup = currentBackup();
    backup.format_version = 3;
    expect(parseImport(backup)).toMatchObject({ ok: false, error: "unsupported format_version: 3" });
  });

  it("mapuje brak reminder_offset_minutes na 0", () => {
    const backup = currentBackup();
    const task = { ...backup.tasks[0] } as Record<string, unknown>;
    delete task.reminder_offset_minutes;
    backup.tasks = [task as typeof backup.tasks[number]];

    const result = parseImport(backup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tasks[0].reminder_offset_minutes).toBe(0);
  });

  it("przyjmuje dozwolone wartości wyprzedzenia", () => {
    for (const value of [0, 15, 30, 60] as const) {
      const backup = currentBackup();
      backup.tasks[0].reminder_offset_minutes = value;
      const result = parseImport(backup);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.data.tasks[0].reminder_offset_minutes).toBe(value);
    }
  });

  it("odrzuca nieprawidłową wartość wyprzedzenia", () => {
    const backup = currentBackup();
    backup.tasks[0].reminder_offset_minutes = 45 as 0;
    expect(parseImport(backup)).toMatchObject({
      ok: false,
      error: "tasks[0].reminder_offset_minutes must be 0, 15, 30 or 60",
    });
  });
});

// Najważniejszy scenariusz: odtworzenie kopii sprzed urodzin NIE może wyczyścić listy urodzin.
describe("parseImport — urodziny w kopii", () => {
  it("kopia w wersji 1 (bez klucza birthdays) zostawia listę nietkniętą", () => {
    const backup = currentBackup() as Record<string, unknown>;
    backup.format_version = 1;
    delete backup.birthdays;

    const result = parseImport(backup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // null, a NIE [] — pusta tablica oznaczałaby „skasuj wszystkie urodziny".
    expect(result.data.birthdays).toBeNull();
  });

  it("najstarsza kopia bez wersji też zostawia listę nietkniętą", () => {
    const backup = currentBackup() as Record<string, unknown>;
    delete backup.format_version;
    delete backup.birthdays;

    const result = parseImport(backup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.birthdays).toBeNull();
  });

  it("kopia w wersji 2 z pustą listą świadomie czyści urodziny", () => {
    const backup = currentBackup() as Record<string, unknown>;
    backup.birthdays = [];

    const result = parseImport(backup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.birthdays).toEqual([]);
  });

  it("zachowuje rocznik i brak rocznika", () => {
    const backup = currentBackup();
    backup.birthdays.push({
      id: 6,
      name: "Bartek",
      month: 12,
      day: 24,
      birth_year: null,
      last_notified_year: 2026,
      created_at: timestamp,
    });

    const result = parseImport(backup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.birthdays?.[0].birth_year).toBe(1990);
    expect(result.data.birthdays?.[1].birth_year).toBeNull();
    expect(result.data.birthdays?.[1].last_notified_year).toBe(2026);
  });

  it("przyjmuje 29 lutego", () => {
    const backup = currentBackup();
    backup.birthdays[0].month = 2;
    backup.birthdays[0].day = 29;
    expect(parseImport(backup).ok).toBe(true);
  });

  it("odrzuca dzień niemożliwy w danym miesiącu", () => {
    const backup = currentBackup();
    backup.birthdays[0].month = 4;
    backup.birthdays[0].day = 31;
    expect(parseImport(backup)).toMatchObject({
      ok: false,
      error: "birthdays[0].day is invalid for the month",
    });
  });

  it("odrzuca miesiąc spoza zakresu", () => {
    const backup = currentBackup();
    backup.birthdays[0].month = 13;
    expect(parseImport(backup)).toMatchObject({
      ok: false,
      error: "birthdays[0].month must be 1-12",
    });
  });

  it("odrzuca puste imię", () => {
    const backup = currentBackup();
    backup.birthdays[0].name = "";
    expect(parseImport(backup)).toMatchObject({ ok: false });
  });

  it("odrzuca duplikaty ID urodzin", () => {
    const backup = currentBackup();
    backup.birthdays.push({ ...backup.birthdays[0] });
    expect(parseImport(backup)).toMatchObject({
      ok: false,
      error: "birthdays contains duplicate id 5",
    });
  });
});
