# Personal Organizer — Todo Archive

> Archiwum dowiezionych prac (Fazy 0–5, redesign „Aurora", dogfooding, sesje 15–18, code review).
> Bieżące otwarte pozycje: [todo.md](todo.md). Pełne decyzje: `../../ai-os/projects/personal-organizer/decisions.md`.
> Ten plik jest pamięcią historyczną — nie dopisuj tu nowej pracy, tylko przenoś z `todo.md` po dowiezieniu.

---

## Model danych (D1) — stan v1
- `projects` (id, name, created_at)
- `tasks` (id, content, due_at UTC nullable, has_time, status open|done, reminded_at,
  `reminder_offset_minutes` 0|15|30|60 default 0, created_at, updated_at) — bez projektu w v1
- `ideas` (id, content, project_id nullable→Ogólne, priority 0|1|2|3 default 0, created_at)
- `push_subscriptions` (id, endpoint UNIQUE, p256dh, auth, created_at)
- `routines` (id, content, last_done_on 'YYYY-MM-DD' lokalna, created_at)

Migracje: `0001_init.sql` + `0002_routines.sql` + `0003_idea_priority.sql`
+ `0004_task_reminder_offset.sql` + `0005_idea_priority_none.sql` (UPDATE danych).
Zakładane ręcznie przez D1 Console (gołe DDL bez komentarzy, jedna linia — patrz lessons.md).

---

## PRIORITY — Stabilizacja po code review (2026-06-18) ✅
Pełny raport: `priority-code-review-2026-06-18.md`.
- [x] P1: Nie ustawiaj `reminded_at`, jeśli żaden push nie został przyjęty (2xx). ✓ 2026-06-18
- [x] P1: Weryfikuj i naprawiaj realną subskrypcję push, nie tylko zgodę `Notification.permission`. ✓ 2026-06-18
- [x] P1: Testy regresyjne dla obu ścieżek push. ✓ 2026-06-18 (10+5 testów Vitest)
- [x] P2: Odrzucaj nieistniejący `project_id` przy zapisie pomysłu. ✓ (helper `projectExists` w POST+PATCH `/api/ideas` → 400)
- [x] P2: Potwierdzenie/Undo przed usunięciem zadania, pomysłu i rutyny. ✓ (wspólny `ConfirmDeleteButton` — inline dwukrok, auto-anulowanie 3,5 s)
- [x] P3: Bezpieczny fallback dla powrotu z `/settings`. ✓ (`navigate(-1)`→`navigate("/")` w `Layout.tsx`)
- [x] P3: Usuń ostrzeżenie CSS z komentarza w `web/src/index.css`. ✓
- [x] P3: Zaktualizuj opis auth w `CLAUDE.md` (Cloudflare Access → token Bearer). ✓ (za zgodą usera)

## Plan v1 — fazy ✅ (wszystkie dowiezione)

### Faza 0 — Fundament ✅
- [x] `git init` + `.gitignore`
- [x] Scaffold `web/` (Vite + React + TS) + Tailwind/router/TanStack Query
- [x] Scaffold `worker/` (Hono + `wrangler.toml`, binding D1) + cron co minutę
- [x] Migracja D1 ze schematem (lokalnie)
- [x] `APP_TOKEN` + middleware auth + ekran „klucza dostępu" + klient API
- [x] Lokalny dev wstaje (vite build OK + wrangler dev + /api/health 401/200)

### Faza 1 — Pionowe przebicie: zadanie → cron → push ✅
- [x] Spike — Web Push z Workera działa: `@block65/webcrypto-web-push`, status 201 z FCM (lokalnie, mimo AV)
- [x] VAPID — klucze wygenerowane; prywatny w `.dev.vars` (sekret), publiczny przez `GET /api/config`
- [x] Endpointy `GET/POST/PATCH/DELETE /api/tasks`, `POST /api/subscribe`, `GET /api/config`, dev `POST /api/_dev/test-push`
- [x] Handler `scheduled` + Cron co minutę (`reminded_at`)
- [x] Front — formularz zadania (data+godzina), zgoda na push, subskrypcja, SW (`injectManifest`), TanStack Query
- [x] P1: Deploy + test push na realnym Androidzie — zrealizowane przez Workers Builds + GitHub (Blok C)
- [x] P1: Test cronu — push ~1 min po terminie = potwierdzony cykl crona na produkcji
- [x] P1: Push po długim idle/doze działa — potwierdzone przez usera 2026-06-19 (C4)

### Faza 2 — Zadania w pełni ✅
- [x] Dolna nawigacja (Dziś / Zadania / Pomysły) + Layout + react-router
- [x] Zakładka „Zadania" (lista + formularz) + usuwanie + toggle „zrobione"
- [x] Wyróżnienie zaległych (czerwone)
- [x] Widok „Dziś" (dzisiejsze + zaległe + szybki guzik pomysłu) + włączanie powiadomień
- [x] P2: Edycja treści/terminu zadania w UI (ołówek → inline form w TaskRow)
- [x] P3: Zadania bez terminu zostają tylko w „Zadania" (sekcja „Bez terminu" w „Dziś" ostatecznie odrzucona 2026-06-19)

### Faza 3 — Pomysły + projekty ✅
- [x] P2: Projekty CRUD (GET/POST/PATCH/DELETE /api/projects; DELETE atomowo przez DB.batch → pomysły do Skrzynki)
- [x] P2: Przechwyt pomysłu (IdeaCapture.tsx + POST /api/ideas)
- [x] P2: Edycja pomysłu (IdeaItem.tsx + PATCH /api/ideas/:id)
- [x] P2: Lista pomysłów pogrupowana po projektach + Skrzynka (Ideas.tsx + ProjectGroup.tsx + useIdeasData.ts)

### Faza 4 — Wykończenie + dowóz ✅
Architektura deployu: jeden Worker serwuje front + API (Workers Static Assets) — ten sam origin, zero CORS.

**Blok A — lokalnie:**
- [x] A1 P1: Manifest PWA + podpięcie ikon (`vite.config.ts`, `index.html`)
- [x] A2 P1: Single-Worker static assets (`[assets]` w `wrangler.toml`, SPA fallback, `run_worker_first=["/api/*"]`)
- [x] A3 P2: Eksport danych (`GET /api/export` → JSON; `lib/export.ts` + guzik)
- [x] A4 P2: Redesign „Aurora" (szczegóły niżej)
- [x] A5 P1: Checklista komend → `DEPLOY.md`

**Blok B — deploy przez GitHub + panel Cloudflare:**
- [x] B1: Kod na GitHubie (`main`, `Mateo2215/Personal-Organizer`)
- [x] B2 (USER): D1 `personal-organizer` utworzona, Database ID w `wrangler.toml`
- [x] B3: Database ID wpisany i wypchnięty (commit b9dee7d)
- [x] B4 (USER): schemat założony przez D1 Console (4 tabele)
- [x] B5 (USER): Workers Builds podłączony (root `worker`, build `npm run ci:build`, deploy `npx wrangler deploy`)
- [x] B6 (USER): sekrety wgrane (APP_TOKEN + 3× VAPID). Apka odpowiada na produkcji.

**Blok C — weryfikacja na Androidzie:**
- [x] C1 P1: PWA zainstalowana, logowanie tokenem działa
- [x] C2 P1: Powiadomienia włączone (2 subskrypcje w D1)
- [x] C3 P1: Push przy zamkniętej apce, punktualnie (~1 min = cykl crona). Strefa OK.
- [x] C4 P2: Push po długim idle/doze — potwierdzony przez usera 2026-06-19
- [x] C5 P1: Kontrola limitów $0 — potwierdzone 2026-06-17 (plan Free, brak karty, fail-closed; <0,5% progu 100k/dobę)

**Drobny dług:**
- [x] P3: `Today.tsx onEnablePush` owinięty w try/catch (UI nie utyka na „Włączam…")

## Redesign Aurora — fazy (A4) ✅
Kierunek: ciemny `#0b0a12`, fioletowy gradient (`#9a86ff`→`#b06bff`), glassmorphism,
fonty Space Grotesk + Manrope, ikony lucide-react, logo „Postęp". Źródło prawdy: handoffy w `design/` (NIE commitowane).
Redesign czysto wizualny (wyjątek: funkcjonalne filtry w Fazie 6). Decyzje sesji 2026-06-17: stopka logowania usunięta,
filtry Zadań wdrożone funkcjonalnie, „handoff/prototyp logo = źródło prawdy".
- [x] Faza 0: `design/` → `.gitignore`
- [x] Faza 1: Fundament — fonty, tokeny Aurora (`@theme`), tło+poświata, `Logo.tsx`
- [x] Faza 2: Shell — `BottomNav.tsx` + `Layout.tsx` (ikony Lucide, blur, safe-area)
- [x] Faza 3: `AccessGate.tsx` — logo+poświata, glass pole, gradient przycisk, BEZ stopki
- [x] Faza 4: `TaskRow.tsx` — okrągły custom checkbox, karty glass, stany done/zaległe
- [x] Faza 5: `Today.tsx` — nagłówek dnia + `ProgressRing.tsx` (SVG), zaległe z glow
- [x] Faza 6: `Tasks.tsx` — composer w karcie + funkcjonalne chipy filtrów + `isUpcoming`
- [x] Faza 7: Pomysły — IdeaCapture/IdeaItem (natywny select ostylowany), ProjectGroup
- [x] Faza 8: `EmptyState.tsx` w Dziś/Zadania/Pomysły; hover transitions
- [x] Ikony PWA wygenerowane (192/512/maskable + apple-touch + favicon.svg) skryptem `web/scripts/generate-icons.mjs`

## Poprawki z dogfoodingu (2026-06-17) ✅ — wypchnięte + zweryfikowane na telefonie
Commit `fd9a54a`.
- [x] Pomysły: pusta Skrzynka znika (renderowana tylko gdy ma pomysły)
- [x] Pomysły: sekcja przechwytu wyróżniona (nagłówek „NOWY POMYSŁ" + kontur/poświata)
- [x] Pomysły: formularz nowego projektu — pole full-width, Anuluj/Dodaj w osobnym rzędzie
- [x] Zadania: dekoracyjna ikona „+" → `ListChecks`
- [x] Nagłówek: logo Aurora przy „Personal Organizer"
- [x] Nagłówek: Eksport + Wyloguj przeniesione do menu (⋮)

## Faza 5 — Zadania codzienne (rutyny) ✅ — potwierdzone na żywo 2026-06-18
Świat „tylko dziś" bez historii, osobna tabela `routines`, reset przez porównanie daty (bez crona), bez push.
Cron/push NIE ruszane (świadoma izolacja).
- [x] P1: Migracja `0002_routines.sql`
- [x] P1: Backend — endpointy `GET/POST/PATCH/DELETE /api/routines` + `routines` w `GET /api/export`
- [x] P1: Front model+akcje — `lib/routines.ts` (data LOKALNA) + `useRoutineActions.ts`
- [x] P1: `RoutineRow.tsx` + render na „Dziś" (góra, pierścień liczy rutyny+zadania)
- [x] P2: Sekcja „Codzienne" w `Tasks.tsx` (później zastąpiona przełącznikiem trybu — sesja 17)
- [x] P2: `routines` w `lib/export.ts`
- [x] P1 (USER): tabela `routines` założona w D1 Console
- [x] P1: kod wypchnięty na `main` (`fd9a54a..7f4b467`) → auto-redeploy
- [x] P1 (live): deploy + UI na telefonie potwierdzone przez usera (2026-06-18) — rdzeń v1 zamknięty

## Mapa drogowa po-v1 — dowiezione funkcje self-extend

### P1 #1 — Pomysły 2.0: priorytety + „Ogólne" ✅ (commit `fd30cad`, live 2026-06-18)
- [x] Migracja `0003_idea_priority.sql`
- [x] Backend: POST/PATCH `/api/ideas` przyjmują `priority`
- [x] Model `lib/ideas.ts`, `PriorityPicker.tsx`, podgląd wiersza (obwódka/poświata + kropka)
- [x] Sortowanie wg wagi wewnątrz grup (stabilny sort)
- [x] Rename „Skrzynka" → „Ogólne"
- [x] (USER) migracja `0003` w D1 Console + push + weryfikacja na telefonie

### P1 #2 — Ekran „Ustawienia" + personalizacja ✅ (commit `cd9e982`, live 2026-06-18)
- [x] `lib/settings.ts` (`getName`/`setName`, localStorage `po_user_name`)
- [x] `features/Settings.tsx` (Personalizacja / Dane / Konto)
- [x] Router `/settings`, `Layout.tsx` (ikona Ustawień/wstecz), powitanie „Dzień dobry, <imię>"
- [x] push + weryfikacja na telefonie

### P2 #3 — Widok kalendarza ✅ (commit `ea13c40`, live 2026-06-18)
Agenda-lista, 4. zakładka, tylko zadania z terminem, toggle done z agendy.
- [x] Zakładka „Kalendarz" w `BottomNav.tsx` + route `/calendar`
- [x] `features/Calendar.tsx` (agenda-lista, grupowanie po dacie lokalnej)
- [x] `CalendarTaskRow.tsx` (lekki wiersz, toggle bez edycji)
- [x] EmptyState + build/lint czyste + push + weryfikacja na telefonie

### P2/P3 #4 — Pomysł → zadanie ~~SKREŚLONE 2026-06-18~~
User trzyma Pomysły (checklista) i Zadania (terminowe) osobno świadomie. Konwersja nie domyka realnej pętli.
Odhaczanie pomysłów też odrzucone (dublowałoby kosz). Drzwi otwarte, gdyby przepływ się zmienił.

### P2/P3 #5 — Import = „Odtwórz z kopii" ✅ kod (commit `fb75bfe`, na `main`)
Wariant A (replace), nie merge. Lustro eksportu `{tasks, ideas, projects, routines}`, subskrypcje push nietknięte,
auto-eksport przed nadpisaniem, walidacja kształtu przed czyszczeniem.
- [x] Backend — pure `parseImport` w `worker/src/import.ts` (testowalny bez mocka)
- [x] Backend — `POST /api/import` (atomowy `DB.batch`, ID zachowane bo czyste tabele)
- [x] Test Vitest dla `parseImport` (bieżący + 2 starsze formaty, błędy) — 10/10, 20/20 worker
- [x] Front — `lib/import.ts` + sekcja Dane w `Settings.tsx` (inline dwukrok potwierdzenia)
- [x] Build + lint + testy czyste
- [x] push commita `fb75bfe` na `main` → auto-redeploy
- [ ] **OTWARTE (live, user):** deliberowany test restore na telefonie → przeniesione do `todo.md`

### P3 #6 — Przypomnienie z wyprzedzeniem + licznik ✅ (commit `c17f3cc`, migr. `0004`)
0/15/30/60 min, jeden push na zadanie, re-arm `reminded_at=NULL` przy zmianie terminu/offsetu.
- [x] Migracja `0004_task_reminder_offset.sql`
- [x] Backend POST/PATCH walidacja offsetu (`readOffset`, 400 dla spoza zestawu)
- [x] Cron kwalifikuje po `unixepoch(due_at) - offset*60 <= now`
- [x] Treść push (`reminderTitle`): `Za 15 min` / `Za 30 min` / `Za 1 godz.`
- [x] Front: `ReminderOffsetPicker` + `useMinuteNow` + licznik „za X"/„X temu"
- [x] Eksport/import: pole zachowane, starsze kopie → 0, `format_version` 1
- [x] Testy backendu/frontu + lokalny smoke D1
- [x] (USER) migracja `0004` w D1 Console + push (`111dfbc..c17f3cc`)
- [x] (live, user) przypomnienia potwierdzone na żywo (state.md: „POTWIERDZONE NA ŻYWO")

### P3 #7 — Sekcja „Bez terminu" w „Dziś" ~~SKREŚLONE 2026-06-19~~
Nieużyteczne w realnym przepływie. Zadania bez terminu zostają w „Zadania".

## Sesja 15 — 3 usprawnienia z użycia (2026-06-19) ✅ (commit `09b415b`, live)
### ① Priorytety pomysłów — 4 stany + recolor
Stan „bez" (0, domyślny); bez=szary, niski=żółty, średni=pomarańczowy, wysoki=czerwony. Migracja `0005` TYLKO danych.
- [x] `index.css` tokeny, `lib/ideas.ts` (0|1|2|3, DEFAULT 0), `clampPriority` (fallback 0), `import.ts` (legacy→0)
- [x] `PriorityPicker.tsx` (4 segmenty + flex-wrap), „bez" pokazuje samą datę
- [x] Migracja `0005_idea_priority_none.sql` (USER w D1 Console) + push + weryfikacja na telefonie
### ② Rutyny — mocna separacja wizualna (później zastąpiona przełącznikiem — sesja 17)
- [x] `Tasks.tsx` restyle sekcji „Codzienne" + push + weryfikacja
### ③ Kalendarz — kompaktowy pasek tygodnia
- [x] `features/WeekStrip.tsx` (busyDays + selected + onSelect)
- [x] `Calendar.tsx` (busyDays z grup, filtr agendy, chip „Pokaż wszystkie") + push + weryfikacja na telefonie

## Sesja 16 — ekran gratulacji + odrzucenia (2026-06-19) ✅ (commit `4e7c973`, live 2026-06-30)
### ① Ekran gratulacji „Dzień zaliczony"
Front-only, `dayComplete = dayTotal > 0 && dayDoneTotal === dayTotal`, karta in-flow, pierwszeństwo przed `isEmpty`.
- [x] `components/DayComplete.tsx` + zmiany w `features/Today.tsx`
- [x] push (`4e7c973`) + **weryfikacja na telefonie POTWIERDZONA przez usera 2026-06-30**
### ② Tagi dla zadań — ODRZUCONE (brak bólu z użycia; łamią „zadania bez projektów")
### ③ Statystyki — ODRZUCONE (wymagają logu zdarzeń sprzecznego z „świat tylko dziś")

## Sesja 17 — przełącznik trybu „Zadania | Codzienne" (2026-06-20) ✅ (commit `3759647`, live)
Źródło zlewania = dwa bliźniacze composery na jednym ekranie. Fix strukturalny (mutual exclusion).
- [x] `Tasks.tsx`: `mode: "tasks" | "routines"` + segmentowany przełącznik; naraz jeden composer + jedna lista
- [x] Usunięta dolna sekcja „Codzienne". Front-only. Push (`0e9119d` + `3759647`)
- [x] User potwierdził na telefonie: mieszanie zniknęło

## Sesja 18 — fix laga startowego danych (2026-06-23) ✅ (commit `9fa06fb`, live 2026-06-30)
Po dłuższej przerwie apka wstawała od razu, ale dane doczytywały się ~30 s. Diagnoza: pusty cache RAM po ubiciu apki
przez Androida + `fetch` bez timeoutu wiszący na śpiącym radiu. Fix front-only.
- [x] `main.tsx`: `PersistQueryClientProvider` + `createSyncStoragePersister(localStorage)` (`po-query-cache`, maxAge/gcTime 7 dni, buster='1', staleTime 1 min, retry 2)
- [x] `api.ts`: timeout 10 s na `fetch` (`AbortSignal.timeout` + `AbortSignal.any`)
- [x] Paczki `@tanstack/react-query-persist-client` + `query-sync-storage-persister` @5.101.1 (zweryfikowane przed instalacją)
- [x] Build + lint + testy 14/14 czyste
- [x] push na `main` (`9fa06fb`) → auto-redeploy
- [x] **(live, user) lag startowy zniknął — POTWIERDZONE przez usera 2026-06-30**
