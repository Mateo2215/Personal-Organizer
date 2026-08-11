// Testy pomocników urodzin. Daty budujemy jawnie jako LOKALNE (new Date(rok, miesiąc-1, dzień)),
// bo cała logika stoi na lokalnej granicy dnia — parsowanie stringów ISO wciągnęłoby UTC.

import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatBirthdayDate,
  groupByMonth,
  isBirthdayToday,
  isLeapYear,
  sortByUpcoming,
  turningAge,
  yearsLabel,
  type Birthday,
} from "../birthdays";

function makeBirthday(over: Partial<Birthday> & { month: number; day: number }): Birthday {
  return {
    id: over.id ?? 1,
    name: over.name ?? "Anna",
    month: over.month,
    day: over.day,
    birth_year: over.birth_year ?? null,
    last_notified_year: over.last_notified_year ?? null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("daysUntil", () => {
  const now = new Date(2026, 6, 15); // 15 lipca 2026, lokalnie

  it("dla dzisiejszej daty zwraca 0", () => {
    expect(daysUntil({ month: 7, day: 15 }, now)).toBe(0);
  });

  it("dla jutra zwraca 1", () => {
    expect(daysUntil({ month: 7, day: 16 }, now)).toBe(1);
  });

  it("datę, która w tym roku minęła, liczy do przyszłego roku", () => {
    // 14 lipca minął o dzień, więc do następnych obchodów zostaje prawie cały rok.
    expect(daysUntil({ month: 7, day: 14 }, now)).toBe(364);
  });

  it("liczy poprawnie przez granicę roku", () => {
    const sylwester = new Date(2026, 11, 31);
    expect(daysUntil({ month: 1, day: 1 }, sylwester)).toBe(1);
  });

  it("29 lutego w roku nieprzestępnym wypada 28 lutego", () => {
    const luty = new Date(2026, 1, 28); // 2026 nie jest przestępny
    expect(daysUntil({ month: 2, day: 29 }, luty)).toBe(0);
  });

  it("29 lutego w roku przestępnym zachowuje własną datę", () => {
    const luty = new Date(2028, 1, 28); // 2028 jest przestępny
    expect(daysUntil({ month: 2, day: 29 }, luty)).toBe(1);
  });

  it("nie gubi się na zmianie czasu (marzec)", () => {
    // Między 28 a 30 marca 2026 wypada zmiana czasu — doba ma wtedy 23 godziny.
    const przedZmiana = new Date(2026, 2, 28);
    expect(daysUntil({ month: 3, day: 30 }, przedZmiana)).toBe(2);
  });
});

describe("isBirthdayToday", () => {
  it("rozpoznaje dzisiejsze urodziny", () => {
    expect(isBirthdayToday({ month: 7, day: 15 }, new Date(2026, 6, 15))).toBe(true);
  });

  it("dla innego dnia zwraca false", () => {
    expect(isBirthdayToday({ month: 7, day: 16 }, new Date(2026, 6, 15))).toBe(false);
  });

  it("o 23:59 wciąż jest dziś", () => {
    expect(isBirthdayToday({ month: 7, day: 15 }, new Date(2026, 6, 15, 23, 59))).toBe(true);
  });
});

describe("turningAge", () => {
  it("liczy wiek kończony w tym roku, gdy urodziny dopiero nadejdą", () => {
    const birthday = makeBirthday({ month: 12, day: 24, birth_year: 1990 });
    expect(turningAge(birthday, new Date(2026, 6, 15))).toBe(36);
  });

  it("po przejściu tegorocznej daty liczy wiek na przyszły rok", () => {
    const birthday = makeBirthday({ month: 1, day: 5, birth_year: 1990 });
    expect(turningAge(birthday, new Date(2026, 6, 15))).toBe(37);
  });

  it("w sam dzień urodzin liczy wiek kończony dziś", () => {
    const birthday = makeBirthday({ month: 7, day: 15, birth_year: 1990 });
    expect(turningAge(birthday, new Date(2026, 6, 15))).toBe(36);
  });

  it("bez rocznika zwraca null", () => {
    expect(turningAge(makeBirthday({ month: 7, day: 15 }), new Date(2026, 6, 15))).toBeNull();
  });
});

describe("yearsLabel", () => {
  it("odmienia zgodnie z polską gramatyką", () => {
    expect(yearsLabel(1)).toBe("rok");
    expect(yearsLabel(2)).toBe("lata");
    expect(yearsLabel(5)).toBe("lat");
    expect(yearsLabel(13)).toBe("lat");
    expect(yearsLabel(22)).toBe("lata");
  });
});

describe("isLeapYear", () => {
  it("zna wyjątek stuleci", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
});

describe("formatBirthdayDate", () => {
  it("odmienia miesiąc w dopełniaczu", () => {
    expect(formatBirthdayDate({ month: 3, day: 15 })).toBe("15 marca");
    expect(formatBirthdayDate({ month: 9, day: 1 })).toBe("1 września");
  });
});

describe("sortByUpcoming", () => {
  const now = new Date(2026, 6, 15); // 15 lipca

  it("stawia najbliższe urodziny na początku, a te sprzed kilku dni na końcu", () => {
    const lista = [
      makeBirthday({ id: 1, name: "Grudniowa", month: 12, day: 24 }),
      makeBirthday({ id: 2, name: "Wczorajszy", month: 7, day: 14 }),
      makeBirthday({ id: 3, name: "Dzisiejsza", month: 7, day: 15 }),
      makeBirthday({ id: 4, name: "Sierpniowy", month: 8, day: 2 }),
    ];

    expect(sortByUpcoming(lista, now).map((b) => b.name)).toEqual([
      "Dzisiejsza",
      "Sierpniowy",
      "Grudniowa",
      "Wczorajszy",
    ]);
  });

  it("przy tym samym dniu porządkuje po imieniu", () => {
    const lista = [
      makeBirthday({ id: 1, name: "Zofia", month: 7, day: 20 }),
      makeBirthday({ id: 2, name: "Adam", month: 7, day: 20 }),
    ];
    expect(sortByUpcoming(lista, now).map((b) => b.name)).toEqual(["Adam", "Zofia"]);
  });

  it("nie modyfikuje przekazanej tablicy", () => {
    const lista = [
      makeBirthday({ id: 1, name: "Grudniowa", month: 12, day: 24 }),
      makeBirthday({ id: 2, name: "Sierpniowy", month: 8, day: 2 }),
    ];
    sortByUpcoming(lista, now);
    expect(lista.map((b) => b.name)).toEqual(["Grudniowa", "Sierpniowy"]);
  });
});

describe("groupByMonth", () => {
  it("zachowuje kolejność wejściową, więc pierwszy nagłówek to bieżący miesiąc", () => {
    const posortowane = sortByUpcoming(
      [
        makeBirthday({ id: 1, name: "Grudniowa", month: 12, day: 24 }),
        makeBirthday({ id: 2, name: "Lipcowy", month: 7, day: 20 }),
        makeBirthday({ id: 3, name: "Grudniowy2", month: 12, day: 2 }),
      ],
      new Date(2026, 6, 15),
    );

    expect(groupByMonth(posortowane).map((g) => g.label)).toEqual(["Lipiec", "Grudzień"]);
  });

  it("dla pustej listy zwraca brak grup", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
