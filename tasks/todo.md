# Personal Organizer — Todo

## Current State
**WDROŻONE NA PRODUKCJĘ I DZIAŁA (2026-06-17).** Apka żyje na Cloudflare (jeden Worker serwuje front+API+cron),
zdeployowana przez **Workers Builds podpięte do GitHuba** (build w chmurze CF, bez lokalnego wranglera — omija antywirusa).
**Push POTWIERDZONY na realnym Androidzie przy ZAMKNIĘTEJ apce** (user, 2026-06-17): powiadomienie przyszło
punktualnie (~1 min po terminie, czyli cykl crona). PWA zainstalowana na ekranie głównym. Strefa czasowa zweryfikowana
(lokalny→UTC poprawne). Rdzeń v1 (Fazy 0–3) + dowóz (Faza 4) = kompletne i używalne.
**Redesign „Aurora" + 6 poprawek z dogfoodingu — zweryfikowane na telefonie przez usera (2026-06-17).**
**Rutyny (zadania codzienne) POTWIERDZONE NA ŻYWO przez usera (2026-06-18)** → rdzeń v1 zamknięty w całości,
luka „używane codziennie" domknięta. Apka jest w realnym codziennym użyciu. Dalszy rozwój = nowe funkcje
self-extend wg mapy drogowej niżej („Mapa drogowa — po v1"), nie kosmetyka.
Stack: Cloudflare Workers (Hono) + D1 + Cron + Web Push + Workers Static Assets; front React+Vite+TS, Tailwind, TanStack Query.
Auth = token aplikacyjny (NIE Cloudflare Access). Repo: GitHub `Mateo2215/Personal-Organizer`, gałąź `main` (push→auto-redeploy).
UWAGA środowisko (dot. tylko LOKALNEGO dev): npm/wrangler wymaga `NODE_OPTIONS=--use-system-ca` (Avast+Norton przechwytują HTTPS).
Deploy NIE używa już lokalnego toolchainu. Pełne decyzje: `../../ai-os/projects/personal-organizer/decisions.md`.

## Model danych (D1)
- `projects` (id, name, created_at)
- `tasks` (id, content, due_at UTC nullable, has_time, status open|done, reminded_at, created_at, updated_at) — bez projektu w v1
- `ideas` (id, content, project_id nullable→Ogólne, priority 1|2|3 default 1, created_at)
- `push_subscriptions` (id, endpoint UNIQUE, p256dh, auth, created_at)

## Plan v1 — fazy

### Faza 0 — Fundament ✅
- [x] `git init` + `.gitignore`
- [x] Scaffold `web/` (Vite + React + TS) + Tailwind/router/TanStack Query
- [x] Scaffold `worker/` (Hono + `wrangler.toml`, binding D1) + cron co minutę
- [x] Migracja D1 ze schematem (lokalnie)
- [x] `APP_TOKEN` + middleware auth + ekran „klucza dostępu" + klient API
- [x] Lokalny dev wstaje (`vite` build OK + `wrangler dev` + /api/health 401/200)

### Faza 1 — Pionowe przebicie: zadanie → cron → push (KRYTYCZNE)
- [x] **Spike** — Web Push z Workera działa: `@block65/webcrypto-web-push`, status 201 z FCM (lokalnie, mimo AV)
- [x] VAPID — klucze wygenerowane; prywatny w `.dev.vars` (sekret), publiczny przez `GET /api/config`
- [x] Endpointy `GET/POST/PATCH/DELETE /api/tasks`, `POST /api/subscribe`, `GET /api/config`, dev `POST /api/_dev/test-push`
- [x] Handler `scheduled` + Cron co minutę (wybór zadań „do przypomnienia teraz", `reminded_at`)
- [x] Front — formularz zadania (data+godzina), zgoda na push, subskrypcja, SW (`injectManifest`), TanStack Query
- [x] P1: Deploy + test push na realnym Androidzie (zamknięta apka, punktualność) — ZREALIZOWANE inną ścieżką (Workers Builds + GitHub, nie Pages+Worker). Patrz Blok C poniżej. Checkbox zaszłościowy.
- [x] P1: Test cronu — push przyszedł ~1 min po terminie = potwierdzony cykl crona na produkcji (Blok C). Checkbox zaszłościowy.
- [ ] P1: Obejście optymalizacji baterii (instrukcja + weryfikacja) — śledzone jako C4 poniżej (weryfikacja po długim idle, user-side).

### Faza 2 — Zadania w pełni (głównie zrobione)
- [x] Dolna nawigacja (Dziś / Zadania / Pomysły) + Layout + react-router
- [x] Zakładka „Zadania" (lista + formularz) + usuwanie + toggle „zrobione"
- [x] Wyróżnienie zaległych (czerwone)
- [x] Widok „Dziś" (dzisiejsze + zaległe + szybki guzik pomysłu) + włączanie powiadomień
- [x] P2: Edycja treści/terminu zadania w UI (ołówek → inline form w TaskRow; mutacja `update` w useTaskActions; build OK)
- [x] P3: Zadania bez terminu (due_at null) — DECYZJA: zostają tylko w „Zadania", „Dziś" pozostaje skupione (dziś+zaległe). Drzwi otwarte na sekcję „Bez terminu", jeśli w użyciu coś będzie umykać.

### Faza 3 — Pomysły + projekty ✅ (backend smoke-tested; UI do klika na żywo)
- [x] P2: Projekty CRUD (dodaj/zmień nazwę/usuń → pomysły do Skrzynki). Backend: GET/POST/PATCH/DELETE /api/projects; DELETE atomowo przez DB.batch przenosi pomysły do Skrzynki. Smoke test OK (project_id→null po usunięciu).
- [x] P2: Przechwyt pomysłu (treść + wybór projektu z listy / nowy w locie). IdeaCapture.tsx + POST /api/ideas.
- [x] P2: Edycja pomysłu (treść + przeniesienie do innego projektu/Skrzynki). IdeaItem.tsx (tryb edycji) + PATCH /api/ideas/:id. Smoke test OK (zmiana treści + move A→B, pusta treść→400).
- [x] P2: Lista pomysłów pogrupowana po projektach + Skrzynka. Ideas.tsx (grupowanie) + ProjectGroup.tsx (nagłówek z rename/delete + wiersze). useIdeasData.ts (queries+mutacje).

### Faza 4 — Wykończenie + dowóz
Architektura deployu: **jeden Worker serwuje front + API** (Workers Static Assets) — ten sam origin, zero CORS,
względne `/api/*` działają bez zmian, jeden deploy. (decyzja 2026-06-16, patrz decisions.md.)

**Blok A — lokalnie (bez konta CF):**
- [x] A1 P1: Manifest PWA + podpięcie ikon. `manifest.icons` w `vite.config.ts` (192/512/512-maskable),
      `index.html` (`lang="pl"`, tytuł, `theme-color`, apple-touch-icon). **Ikony powstają w Claude Design** —
      kod referuje ścieżki w `web/public/`, spec w `web/public/ICONS.md`; pliki PNG wrzucimy gdy gotowe. Build OK.
- [x] A2 P1: Single-Worker static assets. `[assets]` w `wrangler.toml` (`directory="../web/dist"`,
      `not_found_handling="single-page-application"`, `run_worker_first=["/api/*"]`). `predeploy` buduje front.
      Zweryfikowane `wrangler deploy --dry-run`: 10 plików z dist, binding D1 OK, config waliduje się.
- [x] A3 P2: Eksport danych. Worker `GET /api/export` → JSON `{tasks, ideas, projects}` (bez subskrypcji).
      Front: `lib/export.ts` + guzik „Eksportuj" w `Layout.tsx` (header). Build tsc+vite OK.
- [~] A4 P2: Przejście designem — W TOKU (2026-06-17). Realizowane jako **redesign „Aurora"** wg handoffów
      w `design/` (NIE commitujemy tego folderu — dodany do `.gitignore`). Rozpiska niżej: „Redesign Aurora — fazy".
- [x] A5 P1: Checklista komend Bloku B — `personal-organizer/DEPLOY.md`.

**Blok B — deploy przez GitHub + panel Cloudflare (ZMIANA 2026-06-17: bez terminala/wranglera lokalnie).**
Powód: antywirus (Avast+Norton, skanowanie HTTPS) psuje lokalny npm/wrangler; build w chmurze CF omija problem.
Build w CI: skrypt `worker` `ci:build` (instaluje front+worker, buduje front), deploy `npx wrangler deploy`. Szczegóły: `DEPLOY.md`.
- [x] B1: Kod na GitHubie (`main`, `Mateo2215/Personal-Organizer`) — prep CI wypchnięty.
- [x] B2 (USER, panel): D1 `personal-organizer` utworzona, Database ID w `wrangler.toml`.
- [x] B3: Database ID wpisany i wypchnięty (commit b9dee7d).
- [x] B4 (USER, panel): schemat założony przez D1 Console (4 tabele potwierdzone `/tables`).
- [x] B5 (USER, panel): Workers Builds podłączony (root `worker`, build `npm run ci:build`, deploy `npx wrangler deploy`, branch `main`). Build success.
- [x] B6 (USER, panel): sekrety wgrane (APP_TOKEN + 3× VAPID). Apka odpowiada na produkcji (user: „działa").

**Blok C — weryfikacja na Androidzie (wspólnie):**
- [x] C1 P1: PWA zainstalowana na ekranie głównym, logowanie tokenem działa.
- [x] C2 P1: Powiadomienia włączone (zgoda dana, 2 subskrypcje zapisane w D1).
- [x] C3 P1: Push PRZYSZEDŁ przy zamkniętej apce, punktualnie (~1 min = cykl crona). Strefa OK (13:49 UTC = 15:49 PL).
- [ ] C4 P2: Obejście optymalizacji baterii — NIEZWERYFIKOWANE przez dłuższy idle. Push zadziałał po krótkim czasie;
      do sprawdzenia w realnym użyciu czy dochodzi też po wielogodzinnym uśpieniu telefonu (open question).
- [x] C5 P1: Kontrola limitów $0 w dashboardzie — POTWIERDZONE 2026-06-17. Plan Workers Free, BRAK karty (fail-closed OK).
      ~360 requests/~6h (cron co minutę + wejścia usera) = <0,5% progu 100k/dobę. Cron „every minute" działa. Ogromny zapas.
      Uwaga: mapa „Request Distribution" pokazuje też region Indie — to cron (wewnętrzna infra CF, nieprzypisana lokalnie)
      i/lub szum botów na publiczny URL; nieszkodliwe (całe /api/* za tokenem → 401 bez niego, front bez sekretów).

**Drobny dług / robustness:**
- [x] P3: `Today.tsx onEnablePush` owinięty w try/catch — przy błędzie (np. `/api/config`) UI nie utyka na „Włączam…",
      pokazuje komunikat błędu. Zweryfikowane w kodzie 2026-06-17 (`Today.tsx:30-39`). Domknięte przy redesignie Aurora.

## Redesign Aurora — fazy (A4, w toku od 2026-06-17)
Kierunek „Aurora": ciemny `#0b0a12`, fioletowy gradient akcentu (`#9a86ff`→`#b06bff`), glassmorphism,
fonty Space Grotesk + Manrope, ikony lucide-react, logo „Postęp" (pierścień + check). Źródło prawdy:
handoffy w `design/` (`dashboard/README.md`, `logo/README.md` + prototypy `.dc.html`). Redesign czysto
wizualny — model danych i logika bez zmian (wyjątek: funkcjonalne filtry w Fazie 6, świadomie dodane).

**Decyzje sesji (2026-06-17):** stopka logowania = USUNĄĆ (Cloudflare Access było tylko w specu, sprzeczne z auth tokenem);
filtry Zadań = WDROŻYĆ funkcjonalnie; tryb pracy = fazami z potwierdzeniem. Drobne niespójności specu
rozstrzygane „handoff/prototyp logo = źródło prawdy" (logo 66px/radius21, gradient przycisków `#b06bff`, znak = „Postęp" nie gwiazdka).

- [x] Faza 0: `design/` → `.gitignore` (nie commitujemy); plan w todo.
- [x] Faza 1: Fundament — instalacja `@fontsource/space-grotesk`+`@fontsource/manrope`+`lucide-react`;
      tokeny Aurora w `index.css` przez `@theme`; tło+poświata+fonty na `body`; usunięty martwy `App.css`;
      komponent `Logo.tsx` (`LogoMark` + `AppIcon`). Build OK.
- [x] Faza 2: Shell — `BottomNav.tsx` (ikony Lucide, blur, safe-area, kolory akcentu) + `Layout.tsx` (ikony eksport/wyloguj per-ekran tytuł Space Grotesk). Build OK.
- [x] Faza 3: `AccessGate.tsx` — logo+poświata, glass pole z kłódką, gradient przycisk, BEZ stopki.
- [x] Faza 4: `TaskRow.tsx` — okrągły custom checkbox (gradient dla done), karty glass zwykła/alarmowa, stany done/zaległe, ikony Lucide.
- [x] Faza 5: `Today.tsx` — nagłówek dnia (data eyebrow + powitanie) + `ProgressRing.tsx` (SVG), sekcja zaległych z glow, przycisk „Dorzuć pomysł" (dashed).
- [x] Faza 6: `Tasks.tsx` — composer w karcie (chip daty: styled label nad ukrytym datetime-local) + funkcjonalne chipy filtrów (Wszystkie/Dziś/Nadchodzące) + helper `isUpcoming` w `lib/tasks`.
- [x] Faza 7: Pomysły — `IdeaCapture`/`IdeaItem` (natywny select ostylowany `appearance-none`+chevron — świadomie, zamiast custom dropdownu: dostępny i naturalny na Androidzie), `ProjectGroup` (licznik-pigułka, inbox), ikony Lucide.
- [x] Faza 8: `EmptyState.tsx` (aura+tytuł+opis+akcje) w Dziś/Zadania/Pomysły; hover transitions na kartach; gradient tła. Build+lint czyste.
- [x] Dług P3 domknięty przy okazji: `Today.onEnablePush` owinięty w try/catch (UI nie utyka na „Włączam…").
- [x] Po redesignie: ikony PWA wygenerowane (192/512/maskable + apple-touch + favicon.svg) skryptem `web/scripts/generate-icons.mjs`
      (sharp z worker/node_modules; geometria znaku wklejona, niezależna od `design/`). theme/bg color = `#0b0a12`. Build kopiuje do `dist`, manifest OK. Domyka „ikony niewgrane".
- [ ] Otwarte do oceny w użyciu: wymiar logo (przyjęto 66px/radius21 z prototypu), gradient przycisków `#b06bff`.

## Poprawki z dogfoodingu (2026-06-17, sesja 2) — WYPCHNIĘTE + ZWERYFIKOWANE NA TELEFONIE ✅
Feedback właściciela po realnym użyciu redesignu „Aurora". Commit `fd9a54a` na `main` → auto-redeploy CF. Build+lint czyste.
- [x] Pomysły: pusta Skrzynka znika (renderowana tylko gdy ma pomysły — `Ideas.tsx`). To systemowy kosz, nie projekt; pusty nie wisi.
- [x] Pomysły: sekcja przechwytu się wyróżnia — nagłówek „NOWY POMYSŁ" + akcentowy kontur/poświata + pole w ramce, placeholder „Co chodzi Ci po głowie?" (`IdeaCapture.tsx`). Adresuje „nie widać gdzie dodać".
- [x] Pomysły: formularz nowego projektu — pole full-width, `Anuluj`/`Dodaj` w osobnym rzędzie → „Anuluj" nie wychodzi poza ramkę.
- [x] Zadania: dekoracyjna ikona „+" (czytana jako martwy przycisk) → `ListChecks` (`Tasks.tsx`).
- [x] Nagłówek (cała apka): logo Aurora (`AppIcon`) przy „Personal Organizer" — wordmark przestał być smutnym szarym tekstem (`Layout.tsx`).
- [x] Nagłówek: Eksport + Wyloguj przeniesione do menu (⋮) z panelem; dolny pasek został przy 3 widokach (`Layout.tsx`).

## Faza 5 — Zadania codzienne (rutyny) — ZAIMPLEMENTOWANE (2026-06-17), do weryfikacji na żywo + deploy
Brainstorm domknięty: świat „tylko dziś" bez historii, osobna tabela `routines`, reset przez porównanie daty
(bez crona), jeden ekran „Dziś" (rutyny na górze, ↻), zarządzanie w „Zadania", bez push. Pełne decyzje:
`../../ai-os/projects/personal-organizer/decisions.md` („2026-06-17 — Zadania codzienne (rutyny)").
Cron/push NIE ruszane (świadoma izolacja). Build (tsc+vite+PWA) + ESLint + typecheck worker = czyste.

- [x] P1: Migracja `worker/migrations/0002_routines.sql` (tabela `routines`: content, last_done_on, created_at).
- [x] P1: Backend — endpointy `GET/POST/PATCH/DELETE /api/routines` (lustro wzorca tasks) + `routines` w `GET /api/export`.
- [x] P1: Front model+akcje — `lib/routines.ts` (`todayLocalDate`/`isDoneToday`, data LOKALNA nie UTC) + `useRoutineActions.ts`.
- [x] P1: `RoutineRow.tsx` (checkbox + ↻; tryb zarządzania = rename inline + usuń) + render na „Dziś" (góra, pierścień liczy rutyny+zadania, EmptyState gdy brak rutyn ORAZ zaległych ORAZ dzisiejszych).
- [x] P2: Sekcja „Codzienne" w `Tasks.tsx` (composer + lista z rename/delete).
- [x] P2: `routines` w `lib/export.ts` (ExportData).
- [x] P1 (USER, panel): tabela `routines` założona w **D1 Console** (gołe DDL bez komentarzy — patrz lessons.md). Potwierdzone usera.
- [x] P1: kod wypchnięty na `main` (2 commity: zaległa lekcja + funkcja rutyn, `fd9a54a..7f4b467`) → Workers Builds auto-redeploy wyzwolony.
- [x] P1 (live): deploy na zielono + przejście UI na telefonie POTWIERDZONE przez usera (2026-06-18): rutyny działają.
      Luka „używane codziennie" domknięta w całości — rdzeń v1 zamknięty.

## Mapa drogowa — po v1 (finalne priorytety, ustalone 2026-06-18)
Rdzeń v1 zamknięty (rutyny potwierdzone na żywo). Poniżej kolejne funkcje self-extend, uporządkowane wspólnie
z userem. Filtr nadrzędny bez zmian: codzienny użytek > liczba funkcji, $0, izolacja crona/push, v1 chude.

### P1 — Następne do zrobienia
- [~] **P1 #1 — Pomysły 2.0: priorytety + „Ogólne"** — ZAIMPLEMENTOWANE LOKALNIE (2026-06-18), do dowozu.
      Build (tsc+vite+PWA) + ESLint + typecheck workera = czyste. Decyzje startowe (do oceny na telefonie):
      3 poziomy Niski(1)/Średni(2)/Wysoki(3), **domyślny = Niski** (świadomie — by nowy pomysł nie świecił od razu),
      paleta szary/żółty/czerwony (token `--color-prio-med` + reużyty `alarm`), znacznik = **obwódka/poświata karty**
      + dyskretna kropka w stopce wiersza.
  - [x] Migracja `worker/migrations/0003_idea_priority.sql` (`ALTER TABLE ideas ADD COLUMN priority INTEGER NOT NULL DEFAULT 1`).
  - [x] Backend: POST/PATCH `/api/ideas` przyjmują `priority` (clamp 1–3); GET/eksport płyną przez `SELECT *` (bez zmian).
  - [x] Model: `lib/ideas.ts` — typ `IdeaPriority`, `DEFAULT_PRIORITY`, `PRIORITIES` (etykiety+klasy), `priorityMeta`.
  - [x] Front: `PriorityPicker.tsx` (3 segmenty z kropką, wspólny), picker w `IdeaCapture` i `IdeaItem` (edycja).
  - [x] Podgląd wiersza: obwódka/poświata wg wagi (`IdeaItem`) + kropka+etykieta w stopce.
  - [x] Sortowanie wg wagi **wewnątrz** grup (`Ideas.tsx`, stabilny sort — kolejność „najnowsze pierwsze" zachowana).
  - [x] Rename „Skrzynka" → „Ogólne": `ProjectGroup` (nagłówek + komunikat usuwania), `Ideas` (EmptyState), opcje selectów, komentarze.
  - [x] **P1 #1a (USER, panel): migracja `0003` w D1 Console** — potwierdzona przez usera (2026-06-18).
  - [x] **P1 #1b: push na `main`** (commit `fd30cad`, `7f4b467..fd30cad`) → Workers Builds auto-redeploy wyzwolony.
  - [x] **P1 #1c (live): weryfikacja na telefonie** — potwierdzona przez usera (2026-06-18): działa.
- [~] **P1 #2 — Ekran „Ustawienia" + personalizacja** — ZAIMPLEMENTOWANE LOKALNIE (2026-06-18), do dowozu.
      Build + ESLint czyste. Decyzje: ikona koła zębatego w nagłówku **zastępuje** menu ⋮ (link do `/settings`),
      na ekranie Ustawień zmienia się w strzałkę wstecz (`navigate(-1)`); dolny pasek zostaje przy 3 zakładkach;
      imię zapisywane na bieżąco do `localStorage` (klucz `po_user_name`).
  - [x] `lib/settings.ts` — `getName`/`setName` (localStorage, trim, puste → usuń klucz).
  - [x] `features/Settings.tsx` — sekcje Personalizacja (imię) / Dane (Eksport) / Konto (Wyloguj). Miejsce na przyszłe przełączniki.
  - [x] Router: trasa `/settings` w `App.tsx`.
  - [x] `Layout.tsx` — usunięte menu ⋮ + logika eksportu/wylogowania (przeniesione do Settings); ikona Ustawień/wstecz, tytuł „Ustawienia".
  - [x] `Today.tsx` — powitanie „Dzień dobry, <imię> 👋" gdy imię ustawione (odczyt `getName()` przy wejściu).
  - [ ] **P1 #2a: push na `main`** → Workers Builds auto-redeploy (sam front + brak zmian D1 — bezpieczne).
  - [ ] **P1 #2b (live): weryfikacja na telefonie** — wejście kołem zębatym, zapis imienia, powitanie na „Dziś", eksport, wylogowanie.

### P2 — Następna duża funkcja
- [ ] **P2 #3 — Widok kalendarza** (zgłoszony brak nr 2): podgląd zaplanowanego na kolejne dni.
      **Wymaga krótkiego brainstormu** (tydzień vs miesiąc, agenda-lista vs siatka, czy pokazywać rutyny) — jak przy rutynach.

### P2/P3 — Usprawnienia przepływu
- [ ] P2/P3 #4 — **Pomysł → zadanie jednym klikiem** (domyka „łapię pomysł, później robię zadanie";
      synergia z priorytetami — ważny pomysł → zadanie z terminem).
- [ ] P2/P3 #5 — **Import danych** (komplement do eksportu; wejście naturalnie z ekranu „Ustawienia").

### P3 — Drobne, gdy zaboli w użyciu
- [ ] P3 #6 — „Przypomnij X minut wcześniej".
- [ ] P3 #7 — Sekcja „Bez terminu" w „Dziś" (drzwi otwarte decyzją z 16.06).
- [ ] P3 #8 — Ręczne sortowanie rutyn (otwarte pytanie — może w ogóle nie uwiera).

### v2+ — Świadomie zaparkowane (zmiany modelu / strategiczne)
- [ ] v2 #9 — Pełne zadania cykliczne (co tydzień, konkretne dni — poza prostymi rutynami codziennymi).
- [ ] v2 #10 — Projekty/tagi jako moduł także dla zadań.
- [ ] v2 #11 — Pełne offline z auto-dosyłaniem (v1: online-only, bez utraty treści przy błędzie).
- [ ] v2 #12 — Cloudflare Access (login Google) jako osobna strona.
- [ ] v2 #13 — Wariant „AI w narzędziu" (łamie $0 — wymaga osobnej decyzji).

## Notatki
- Najpierw Faza 1 (push end-to-end). Ryzyko nr 1: wysyłka Web Push z Workera — udowodnić w spike'u, zanim zbudujemy resztę.
- $0: Cron co minutę = 1440/dobę << 100k limit Workers; D1/Pages z dużym zapasem; nigdy plan z kartą (fail-closed).
- Strefa: front konwertuje lokalny↔UTC; baza i cron w UTC.
- FCM/Firebase świadomie odrzucone (jeden dostawca; budzik Google wymaga karty).
