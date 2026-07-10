import { describe, expect, it } from "vitest";
import { formatRelativeToDue, formatTaskDue, offsetLabel } from "../tasks";

const now = Date.parse("2026-06-19T12:00:00.000Z");

describe("formatRelativeToDue", () => {
  it("termin w przyszlosci liczy za X", () => {
    expect(formatRelativeToDue("2026-06-19T14:00:00.000Z", now)).toBe("za 2 godz.");
    expect(formatRelativeToDue("2026-06-19T12:30:00.000Z", now)).toBe("za 30 min");
  });

  it("termin w przeszlosci liczy X temu", () => {
    expect(formatRelativeToDue("2026-06-19T11:45:00.000Z", now)).toBe("15 min temu");
  });

  it("termin teraz", () => {
    expect(formatRelativeToDue("2026-06-19T12:00:00.000Z", now)).toBe("teraz");
  });

  it("liczba dni z poprawną odmianą", () => {
    expect(formatRelativeToDue("2026-06-20T12:00:00.000Z", now)).toBe("za 1 dzień");
    expect(formatRelativeToDue("2026-06-22T12:00:00.000Z", now)).toBe("za 3 dni");
  });
});

describe("offsetLabel", () => {
  it("0 (o terminie) → brak etykiety", () => {
    expect(offsetLabel(0)).toBeNull();
  });

  it("wyprzedzenia → czytelna etykieta", () => {
    expect(offsetLabel(15)).toBe("15 min wcześniej");
    expect(offsetLabel(30)).toBe("30 min wcześniej");
    expect(offsetLabel(60)).toBe("1 godz. wcześniej");
  });

  it("nieznana wartość → brak etykiety", () => {
    expect(offsetLabel(45)).toBeNull();
  });
});

describe("formatTaskDue", () => {
  it("dodaje skrót dnia tygodnia do terminu", () => {
    expect(formatTaskDue(new Date(2026, 6, 13, 14, 0).toISOString())).toBe("pon., 13.07, 14:00");
    expect(formatTaskDue(new Date(2026, 6, 15, 9, 5).toISOString())).toBe("śr., 15.07, 09:05");
  });

  it("bez terminu zachowuje czytelną etykietę", () => {
    expect(formatTaskDue(null)).toBe("bez terminu");
  });
});
