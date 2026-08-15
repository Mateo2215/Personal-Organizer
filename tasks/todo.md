# Personal Organizer — Todo

> Historia dowiezionego (Fazy 0–5, redesign Aurora, dogfooding, sesje 15–18, code review):
> [todo-archive.md](todo-archive.md). Tu trzymamy tylko **otwarte pozycje**. Pełne decyzje:
> `../../ai-os/projects/personal-organizer/decisions.md`.

## Current State
**RDZEŃ v1 ZAMKNIĘTY. Apka WDROŻONA, ŻYWA, w REALNYM CODZIENNYM UŻYCIU.** Jeden Cloudflare Worker (Hono)
serwuje front + API + cron (Workers Static Assets); deploy przez Workers Builds podpięte do GitHuba
(push na `main` → build i redeploy w chmurze CF, bez lokalnego wranglera). Limity $0 potwierdzone
(plan Free, brak karty, fail-closed). Push przy zamkniętej apce i po długim doze potwierdzony.

Stack: Cloudflare Workers (Hono) + D1 + Cron + Web Push + Workers Static Assets;
front React + Vite + TS, Tailwind, TanStack Query (cache persist do `localStorage`).
Auth = token aplikacyjny Bearer (NIE Cloudflare Access). Repo: GitHub `Mateo2215/Personal-Organizer`, gałąź `main`.

**Repo czyste i zsynchronizowane z `origin/main`** (ostatni commit funkcji: sesja 22, `0b4ccbc` — urodziny).
Cała mapa drogowa P1/P2/P3 dowieziona i potwierdzona na żywo (m.in. lag startowy i ekran gratulacji
potwierdzone przez usera 2026-06-30). Świadomie skreślone: pomysł→zadanie (#4), sekcja „Bez terminu" (#7),
tagi i statystyki (łamią linie cięcia v1).

**Faza bieżąca:** „używaj i zbieraj tarcie" — NIE budować z góry; kolejna funkcja dopiero, gdy realne
użycie wskaże konkretny ból. Otwarte pytania do oceny w użyciu żyją w `state.md` (Open questions), nie tu.

⚠️ Środowisko (tylko LOKALNY dev): npm/wrangler wymaga `NODE_OPTIONS=--use-system-ca` (Avast+Norton przechwytują HTTPS).
Deploy NIE używa lokalnego toolchainu. Migrację D1 zakładaj PRZED pushem (push = natychmiastowy auto-redeploy na prod).

## Otwarte pozycje

### 🎂 Urodziny — NOWA FUNKCJA (plan zatwierdzony, implementacja fazami)

**Cel:** push o 8:00 rano czasu lokalnego w dniu urodzin kogoś z grona + karta „Dziś urodziny ma X" na ekranie „Dziś".

**Ustalenia (sesja 22):** powiadomienie TYLKO w dniu (bez wyprzedzenia); zarządzanie listą na
osobnej podstronie `/birthdays` z wejściem z Ustawień (dolna nawigacja zostaje 4-zakładkowa);
urodziny wchodzą do eksportu/importu w tej samej sesji (`format_version` 1→2).

**Model:** osobna tabela `birthdays` z `month`+`day` (BEZ roku w kluczu) — rocznica jest niejawna,
więc omijamy „przezbrajanie terminu" z v2 #9. `last_notified_year` = idempotencja roczna,
dokładny wzorzec `last_done_on` z rutyn. `birth_year` opcjonalny → wiek tylko gdy znany.

#### Faza 1 — dane + API + cron (backend, jeszcze niewidoczne) — ✅ WYPCHNIĘTE na `main` (`0b4ccbc`)
- [x] `worker/migrations/0006_birthdays.sql` — tabela + indeks `(month, day)`.
      ⚠️ ZAŁOŻYĆ RĘCZNIE W D1 CONSOLE **PRZED** pushem (push = natychmiastowy redeploy prod).
- [x] `worker/src/birthdays.ts` (nowy, czysty/testowalny jak `scheduler.ts`): lokalna data w
      `Europe/Warsaw` przez `Intl` (DST samo się liczy), dopasowanie `month`/`day`,
      **fallback 29.02 → 28.02 w latach nieprzestępnych**, treść powiadomienia + wiek.
- [x] CRUD `/api/birthdays` w `worker/src/index.ts` (GET/POST/PATCH/DELETE) + walidacja zakresów
      (`month` 1-12, `day` zgodny z miesiącem, `birth_year` sensowny lub NULL).
- [x] Rozszerzyć handler `scheduled`: gdy lokalna godzina < 8 → **w ogóle nie ruszamy D1** ($0);
      gdy ≥ 8 → wyślij dla dopasowanych z `last_notified_year` < bieżący rok, ustaw rok
      dopiero po ≥1 odpowiedzi 2xx (ta sama polityka co `reminded_at`; zgubiony tick sam się naprawia).
- [x] Testy workera: dopasowanie dat, 29.02, próg godziny, walidacja tras, re-arm po zmianie daty.
- [x] **Refaktor przy okazji:** polityka „ślad dopiero po ≥1 2xx" wyciągnięta z `processTaskReminders`
      do wspólnego `notifySubscribers` w `scheduler.ts` — jedna kopia zamiast dwóch rozjeżdżających się.
      `processTaskReminders` zostało cienką nakładką o niezmienionej sygnaturze.
- [x] **Weryfikacja:** worker **69/69** testów (w tym 13 istniejących `scheduler` — dowód braku regresji),
      `tsc --noEmit` czysty, migracja i zapytania crona sprawdzone na realnym SQLite (`--local`):
      fallback 29.02 i filtr `last_notified_year` potwierdzone na danych.

- [x] **P1 (KLIK USERA): założyć migrację `0006` w D1 Console PRZED pushem.** Zrobione przez usera
      2026-08-11, potwierdzone — kolejność migracja→push zachowana. Gołe DDL, jedna linia
      (konsola spłaszcza tekst, komentarz `--` zjada resztę — zob. `lessons.md` 2026-06-17).

#### Faza 2 — front: ekran zarządzania + karta na „Dziś" — ✅ WYPCHNIĘTE na `main` (`0b4ccbc`)
- [x] `web/src/lib/birthdays.ts` — typy, wywołania API, `daysUntil`/`turningAge`/sortowanie/grupowanie.
      Reguła 29.02 celowo IDENTYCZNA jak w cronie — inaczej lista pokazywałaby co innego, niż wysyła push.
- [x] `web/src/features/Birthdays.tsx` — lista „od najbliższych" pogrupowana po miesiącach, dodawanie,
      edycja inline, usuwanie przez istniejący `ConfirmDeleteButton`.
      Pomocnicze: `useBirthdayActions.ts`, `BirthdayForm.tsx` (wspólny dla dodawania i edycji), `BirthdayRow.tsx`.
- [x] Trasa `/birthdays` w `App.tsx` + wejście z `Settings.tsx` + tytuł i powrót w `Layout.tsx`
      (`BACK_TARGETS`: z `/birthdays` wraca się do `/settings`, nie na „Dziś").
- [x] Karta urodzinowa na „Dziś" (`components/BirthdayCard.tsx`) — **PIERWSZEŃSTWO nad `DayComplete`
      i `EmptyState`**; urodziny są poza pierścieniem postępu (nie da się ich „odhaczyć").
- [x] Testy frontu **38/38** (22 nowe), lint czysty, build przechodzi.
      Bump `buster` NIEPOTRZEBNY (nowy klucz `['birthdays']`, kształt istniejących bez zmian).
- [ ] **P2 (KLIK USERA): test wizualny na telefonie po deployu** — czy karta czytelna, czy lista
      od najbliższych ma sens, czy dwa selecty (dzień/miesiąc) są wygodne kciukiem.

- [ ] **Bez wyszukiwarki** — świadomie, do czasu sygnału z użycia. Lista grupowana po miesiącach
      działa i przy 8, i przy 30 osobach; wyszukiwarka przy kilkunastu byłaby pustym ozdobnikiem.

#### Faza 3 — backup (eksport/import v2) — ✅ WYPCHNIĘTE na `main` (`0b4ccbc`)
- [x] `EXPORT_FORMAT_VERSION` 1→2 + `parseBirthday` w `worker/src/import.ts`; `/api/export`
      i `/api/import` obsługują urodziny; `ExportData` w `web/src/lib/export.ts`.
      Wersje wczytywane: `SUPPORTED_VERSIONS = [1, 2]` + kopie bez wersji (najstarsze).
- [x] **Rozstrzygnięte:** `ImportData.birthdays` to `ImportBirthday[] | null`. `null` = kopia
      nie ma klucza `birthdays` (v1) → **tabela nietknięta**; `[]` = kopia mówi wprost „brak" → czyścimy.
      Import dokłada `DELETE`+`INSERT` urodzin do batcha WARUNKOWO. Świadome odstępstwo od
      zachowania `routines` (tam brak klucza = wyczyść) — inaczej odtworzenie starej kopii
      po cichu skasowałoby całą listę urodzin.
- [x] Podsumowanie importu rozróżnia „Urodziny: N" od „Lista urodzin bez zmian (kopia jej nie zawierała)".
      `Settings.tsx` invaliduje też `['birthdays']`.
- [x] Testy: **worker 78/78** (22 w `import.test.ts`), kopia v1 i bezwersyjna nie kasują urodzin,
      v2 z `[]` czyści, walidacja daty/duplikatów, odrzucenie wersji 3.
- [x] **ZMIENIONE 2 ISTNIEJĄCE TESTY** (celowa zmiana zachowania, nie naginanie pod kod):
      `format_version` w wyniku parsera 1→2 oraz test „odrzuca przyszłą wersję" z 2 na 3.
- [x] Smoke na realnym SQLite: `INSERT ... json_each` zachowuje `birth_year = NULL`
      (nie zamienia braku rocznika na 0) i `last_notified_year`.

#### Weryfikacja całości (Fazy 1-3)
- [x] Worker **78/78**, front **38/38**, `tsc --noEmit` czysty w obu paczkach, lint czysty, build przechodzi.
- [x] Migracja `0006` założona w produkcyjnym D1 przez usera (2026-08-11, potwierdzone).
- [x] **PUSH na `main` wykonany** — commit `0b4ccbc` (2026-08-11), kolejność migracja→push zachowana.
      Workers Builds uruchomione pushem.

#### Zostaje do potwierdzenia na żywo (klik usera — kod nie wykona)
- [ ] **P1: pierwszy realny push urodzinowy** — dodaj osobę z datą na dziś, poczekaj do 8:00
      rano czasu lokalnego (lub dodaj po 8:00 — wtedy przyjdzie przy najbliższym ticku crona).
      To jedyna część, której nie da się zweryfikować inaczej niż upływem czasu.
- [ ] **P2: ekran `/birthdays` na telefonie** — czy dwa selecty (dzień/miesiąc) są wygodne kciukiem,
      czy lista „od najbliższych" ma sens, czy edycja przez tap w wiersz jest odkrywalna.
- [ ] **P2: karta na „Dziś"** — czy czytelna i czy nie przeszkadza, gdy nie ma urodzin (nie powinna się pokazywać).
- [ ] **P3: eksport po zmianie formatu** — pobierz kopię i sprawdź, że ma `format_version: 2`
      oraz sekcję `birthdays`.

### Skróty dni tygodnia przy terminach — wypchnięte na `main`, czekają na test telefonu
- [x] Dodać wspólny formatter `13.07, 14:00 - pon.` dla terminów zadań, bez zmiany API ani danych.
- [x] Pokazać skrót w formularzu dodawania, wierszach „Zadania”/„Dziś” oraz podglądzie edycji.
- [x] Potwierdzić testami, lintem i buildem poprawne dni tygodnia oraz brak terminu.

### Zbiorcze usuwanie wykonanych zadań — wypchnięte na `main`, czeka na test telefonu
- [x] Dodać chroniony endpoint usuwający wszystkie zwykłe zadania ze statusem `done`.
- [x] Dodać dwustopniowy przycisk „Usuń wykonane (N)” w trybie „Zadania”.
- [x] Potwierdzić testami, lintem i buildem, że rutyny oraz pozostałe zachowania są nietknięte.

### Weryfikacje na telefonie (klik usera — kod nie wykona)
- [ ] **P2: Skróty dni tygodnia po deployu** — dodaj lub edytuj zadanie na dzień inny niż dziś i potwierdź
      format `10.07, 17:10 - pt.` w chipie formularza, na „Zadania”, „Dziś” oraz w podglądzie edycji.
- [ ] **P2: Zbiorcze usuwanie po deployu** — wykonaj dwa zwykłe zadania, zostaw jedno otwarte i jedną rutynę,
      potwierdź licznik oraz dwukrok, a po usunięciu sprawdź, że zostały zadanie otwarte i rutyna.
- [ ] **P3: Deliberowany test restore** (import #5) — eksport → dodaj rekord tymczasowy → „Odtwórz z kopii"
      → rekord znika, wcześniejsze dane zgodne. Niski priorytet (kod 20/20 + smoke + zdrowy deploy);
      przy okazji ocenić czytelność auto-eksportu przed nadpisaniem.

### Drobne — gdy zaboli w użyciu
- [ ] P3 #8 — Ręczne sortowanie rutyn (otwarte pytanie — może w ogóle nie uwiera).

## v2+ — Świadomie zaparkowane (zmiany modelu / strategiczne)
- [ ] v2 #9 — Pełne zadania cykliczne (co tydzień, konkretne dni — poza prostymi rutynami codziennymi).
- [ ] v2 #10 — Projekty/tagi jako moduł także dla zadań.
- [ ] v2 #11 — Pełne offline z auto-dosyłaniem (v1: online-only, bez utraty treści przy błędzie).
- [ ] v2 #12 — Cloudflare Access (login Google) jako osobna strona.
- [ ] v2 #13 — Wariant „AI w narzędziu" (łamie $0 — wymaga osobnej decyzji).

## Notatki
- $0: Cron co minutę = 1440/dobę << 100k limit Workers; D1/Pages z dużym zapasem; nigdy plan z kartą (fail-closed).
- Strefa: front konwertuje lokalny↔UTC; baza i cron w UTC.
- FCM/Firebase świadomie odrzucone (jeden dostawca; budzik Google wymaga karty).
- **Dyscyplina cache:** każda zmiana KSZTAŁTU danych w cache TanStack wymaga bumpu `buster` w `main.tsx`
  (inaczej stary cache zostanie podany jako świeży).
