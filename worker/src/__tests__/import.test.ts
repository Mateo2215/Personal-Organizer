import { describe, expect, it } from "vitest";
import { parseImport } from "../import";

const timestamp = "2026-06-18T18:30:00.000Z";

function currentBackup() {
  return {
    format_version: 1,
    tasks: [{
      id: 1,
      content: "Zadanie",
      due_at: timestamp,
      has_time: 1,
      status: "open",
      reminded_at: null,
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
  };
}

describe("parseImport", () => {
  it("przyjmuje bieżący format i zachowuje dane", () => {
    const result = parseImport(currentBackup());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.format_version).toBe(1);
    expect(result.data.ideas[0].priority).toBe(3);
    expect(result.data.routines).toHaveLength(1);
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
    expect(result.data.ideas[0].priority).toBe(1);
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
    expect(result.data.ideas[0].priority).toBe(1);
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
    backup.format_version = 2;
    expect(parseImport(backup)).toMatchObject({ ok: false, error: "unsupported format_version: 2" });
  });
});
