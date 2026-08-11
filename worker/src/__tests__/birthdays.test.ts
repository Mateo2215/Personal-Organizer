// Testy logiki urodzin. Najwięcej uwagi dostaje przeliczanie strefy i 29 lutego —
// tam siedzi całe realne ryzyko (cron chodzi w UTC, a urodziny to data lokalna).

import { describe, expect, it } from "vitest";
import {
  birthdayDayKeys,
  birthdayNotification,
  isLeapYear,
  isValidMonthDay,
  localDateParts,
  readBirthYear,
  turningAge,
  yearsLabel,
} from "../birthdays";

describe("localDateParts", () => {
  it("stosuje czas letni (UTC+2) dla lipca", () => {
    const parts = localDateParts(new Date("2026-07-15T05:30:00Z"));
    expect(parts).toEqual({ year: 2026, month: 7, day: 15, hour: 7 });
  });

  it("stosuje czas zimowy (UTC+1) dla stycznia", () => {
    const parts = localDateParts(new Date("2026-01-15T05:30:00Z"));
    expect(parts).toEqual({ year: 2026, month: 1, day: 15, hour: 6 });
  });

  it("przesuwa datę, gdy lokalna doba wyprzedza UTC", () => {
    // 23:30 UTC to już następny dzień w Warszawie — inaczej urodziny wypadłyby dzień za wcześnie.
    const parts = localDateParts(new Date("2026-03-15T23:30:00Z"));
    expect(parts).toEqual({ year: 2026, month: 3, day: 16, hour: 0 });
  });

  it("zwraca godzinę 0, nie 24, tuż po lokalnej północy", () => {
    expect(localDateParts(new Date("2026-03-15T23:30:00Z")).hour).toBe(0);
  });
});

describe("isLeapYear", () => {
  it("rozpoznaje lata przestępne i zwykłe", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });

  it("zna wyjątek stuleci: 1900 nie, 2000 tak", () => {
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe("birthdayDayKeys", () => {
  it("w zwykły dzień pyta o jedną parę miesiąc/dzień", () => {
    expect(birthdayDayKeys({ year: 2026, month: 3, day: 15, hour: 9 }))
      .toEqual([{ month: 3, day: 15 }]);
  });

  it("28 lutego w roku nieprzestępnym przejmuje też rocznik 29 lutego", () => {
    expect(birthdayDayKeys({ year: 2026, month: 2, day: 28, hour: 9 }))
      .toEqual([{ month: 2, day: 28 }, { month: 2, day: 29 }]);
  });

  it("28 lutego w roku przestępnym NIE przejmuje 29 lutego (przyjdzie jutro)", () => {
    expect(birthdayDayKeys({ year: 2028, month: 2, day: 28, hour: 9 }))
      .toEqual([{ month: 2, day: 28 }]);
  });

  it("29 lutego w roku przestępnym działa normalnie", () => {
    expect(birthdayDayKeys({ year: 2028, month: 2, day: 29, hour: 9 }))
      .toEqual([{ month: 2, day: 29 }]);
  });
});

describe("isValidMonthDay", () => {
  it("przyjmuje poprawne daty", () => {
    expect(isValidMonthDay(3, 15)).toBe(true);
    expect(isValidMonthDay(12, 31)).toBe(true);
  });

  it("przyjmuje 29 lutego (data urodzin nie niesie roku)", () => {
    expect(isValidMonthDay(2, 29)).toBe(true);
  });

  it("odrzuca dzień spoza miesiąca", () => {
    expect(isValidMonthDay(2, 30)).toBe(false);
    expect(isValidMonthDay(4, 31)).toBe(false);
    expect(isValidMonthDay(1, 32)).toBe(false);
    expect(isValidMonthDay(1, 0)).toBe(false);
  });

  it("odrzuca miesiąc spoza zakresu i wartości nieliczbowe", () => {
    expect(isValidMonthDay(0, 10)).toBe(false);
    expect(isValidMonthDay(13, 10)).toBe(false);
    expect(isValidMonthDay("3", 15)).toBe(false);
    expect(isValidMonthDay(3, 15.5)).toBe(false);
    expect(isValidMonthDay(undefined, undefined)).toBe(false);
  });
});

describe("readBirthYear", () => {
  it("brak rocznika mapuje na null", () => {
    expect(readBirthYear(undefined, 2026)).toBeNull();
    expect(readBirthYear(null, 2026)).toBeNull();
  });

  it("przyjmuje sensowny rocznik", () => {
    expect(readBirthYear(1990, 2026)).toBe(1990);
  });

  it("odrzuca rocznik z przyszłości i absurdalnie stary", () => {
    expect(readBirthYear(2027, 2026)).toBe("invalid");
    expect(readBirthYear(1899, 2026)).toBe("invalid");
  });

  it("odrzuca wartości nieliczbowe", () => {
    expect(readBirthYear("1990", 2026)).toBe("invalid");
    expect(readBirthYear(1990.5, 2026)).toBe("invalid");
  });
});

describe("turningAge", () => {
  it("liczy kończony wiek", () => {
    expect(turningAge(1990, 2026)).toBe(36);
  });

  it("bez rocznika zwraca null", () => {
    expect(turningAge(null, 2026)).toBeNull();
  });

  it("dla rocznika z bieżącego roku zwraca null zamiast zera", () => {
    expect(turningAge(2026, 2026)).toBeNull();
  });
});

describe("yearsLabel", () => {
  it("odmienia zgodnie z polską gramatyką", () => {
    expect(yearsLabel(1)).toBe("rok");
    expect(yearsLabel(2)).toBe("lata");
    expect(yearsLabel(4)).toBe("lata");
    expect(yearsLabel(5)).toBe("lat");
    expect(yearsLabel(22)).toBe("lata");
    expect(yearsLabel(30)).toBe("lat");
  });

  it("obsługuje wyjątek nastek", () => {
    expect(yearsLabel(12)).toBe("lat");
    expect(yearsLabel(13)).toBe("lat");
    expect(yearsLabel(14)).toBe("lat");
  });
});

describe("birthdayNotification", () => {
  const base = { id: 1, name: "Anna", month: 3, day: 15 };

  it("z rocznikiem podaje kończony wiek", () => {
    expect(birthdayNotification({ ...base, birth_year: 1990 }, 2026)).toEqual({
      title: "Urodziny 🎂",
      body: "Anna kończy dziś 36 lat",
    });
  });

  it("bez rocznika podaje samo imię", () => {
    expect(birthdayNotification({ ...base, birth_year: null }, 2026)).toEqual({
      title: "Urodziny 🎂",
      body: "Anna ma dziś urodziny",
    });
  });
});
