# Personal Organizer — Todo

## Current State
Faza 0 ZROBIONA (commit 8c2b62a). Faza 1 — RDZEŃ DZIAŁA: spike push potwierdzony (status 201 z FCM,
lokalnie mimo antywirusa). Pełny łańcuch front→Worker→push przebity end-to-end. Zostaje tylko test
na realnym Androidzie + punktualność cronu, co wymaga wdrożenia (konto Cloudflare).
Stack: Cloudflare Pages + Workers (Hono) + D1 + Cron + Web Push; front React+Vite+TS, Tailwind, TanStack Query.
Auth = token aplikacyjny (NIE Cloudflare Access). Repo: git na gałęzi `main`.
Konto Cloudflare potrzebne dopiero do testu push na realnym Androidzie (deploy) — sam SPIKE wysyłki
push da się sprawdzić lokalnie na desktopowym Chrome (localhost = secure context).
UWAGA środowisko: npm/wrangler wymaga `NODE_OPTIONS=--use-system-ca` (antywirus przechwytuje HTTPS).
Pełne decyzje: `../../ai-os/projects/personal-organizer/decisions.md`. Plan: `~/.claude/plans/...structured-melody.md`.

## Model danych (D1)
- `projects` (id, name, created_at)
- `tasks` (id, content, due_at UTC nullable, has_time, status open|done, reminded_at, created_at, updated_at) — bez projektu w v1
- `ideas` (id, content, project_id nullable→Skrzynka, created_at)
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
- [ ] P1: Deploy na Pages+Worker → test push na realnym Androidzie (zamknięta apka, punktualność) — wymaga konta CF
- [ ] P1: Test cronu (lokalnie: `curl .../cdn-cgi/handler/scheduled`; punktualność dopiero po deployu)
- [ ] P1: Obejście optymalizacji baterii (instrukcja + weryfikacja) — po deployu

### Faza 2 — Zadania w pełni (głównie zrobione)
- [x] Dolna nawigacja (Dziś / Zadania / Pomysły) + Layout + react-router
- [x] Zakładka „Zadania" (lista + formularz) + usuwanie + toggle „zrobione"
- [x] Wyróżnienie zaległych (czerwone)
- [x] Widok „Dziś" (dzisiejsze + zaległe + szybki guzik pomysłu) + włączanie powiadomień
- [x] P2: Edycja treści/terminu zadania w UI (ołówek → inline form w TaskRow; mutacja `update` w useTaskActions; build OK)
- [x] P3: Zadania bez terminu (due_at null) — DECYZJA: zostają tylko w „Zadania", „Dziś" pozostaje skupione (dziś+zaległe). Drzwi otwarte na sekcję „Bez terminu", jeśli w użyciu coś będzie umykać.

### Faza 3 — Pomysły + projekty
- [ ] P2: Projekty CRUD (dodaj/zmień nazwę/usuń → pomysły do Skrzynki)
- [ ] P2: Przechwyt pomysłu (treść + wybór projektu z listy / nowy w locie)
- [ ] P2: Lista pomysłów pogrupowana po projektach + Skrzynka

### Faza 4 — Wykończenie + dowóz
- [ ] P1: Manifest PWA + ikony (instalacja na ekran główny)
- [ ] P2: Przejście designem (ciemny/minimal, wytyczne `pretty`)
- [ ] P2: Guzik eksportu danych (`GET /api/export` → JSON)
- [ ] P1: Konto Cloudflare + produkcyjny deploy (Pages + Worker + D1 + Cron)
- [ ] P1: Kontrola limitów $0 po wdrożeniu

## Świadomie później (v2+)
- [ ] P3: „Przypomnij X minut wcześniej"
- [ ] P3: Pełne offline z auto-dosyłaniem (v1: online-only, bez utraty treści przy błędzie)
- [ ] P3: Import danych z pliku
- [ ] P3: Projekty/tagi jako moduł dla zadań; zadania cykliczne; pomysł→zadanie; kalendarz
- [ ] P3: Cloudflare Access (login Google) jako osobna strona; wariant „AI w narzędziu"

## Notatki
- Najpierw Faza 1 (push end-to-end). Ryzyko nr 1: wysyłka Web Push z Workera — udowodnić w spike'u, zanim zbudujemy resztę.
- $0: Cron co minutę = 1440/dobę << 100k limit Workers; D1/Pages z dużym zapasem; nigdy plan z kartą (fail-closed).
- Strefa: front konwertuje lokalny↔UTC; baza i cron w UTC.
- FCM/Firebase świadomie odrzucone (jeden dostawca; budzik Google wymaga karty).
