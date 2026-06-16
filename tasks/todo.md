# Personal Organizer — Todo

## Current State
Faza 0 w toku (2026-06-16). Plan v1 zatwierdzony po grillu + weryfikacji limitów $0 Cloudflare.
Stack: Cloudflare Pages + Workers (Hono) + D1 + Cron + Web Push; front React+Vite+TS, Tailwind, TanStack Query.
Auth = token aplikacyjny (NIE Cloudflare Access). Repo: git init done (gałąź `main`).
Konto Cloudflare zakładamy dopiero w Fazie 4 — Faza 0–3 lecą lokalnie (`wrangler dev --local`).
Pełne decyzje: `../../ai-os/projects/personal-organizer/decisions.md`. Plan: `~/.claude/plans/...structured-melody.md`.

## Model danych (D1)
- `projects` (id, name, created_at)
- `tasks` (id, content, due_at UTC nullable, has_time, status open|done, reminded_at, created_at, updated_at) — bez projektu w v1
- `ideas` (id, content, project_id nullable→Skrzynka, created_at)
- `push_subscriptions` (id, endpoint UNIQUE, p256dh, auth, created_at)

## Plan v1 — fazy

### Faza 0 — Fundament
- [x] `git init` + `.gitignore`
- [ ] P1: Scaffold `web/` (Vite + React + TS)
- [ ] P1: Tailwind CSS w `web/` (ciemny, mobile-first)
- [ ] P1: Scaffold `worker/` (Hono + `wrangler.toml`, binding D1)
- [ ] P1: Migracja D1 ze schematem (lokalnie)
- [ ] P1: `APP_TOKEN` (sekret) + middleware auth + ekran „klucza dostępu"
- [ ] P1: Lokalny dev wstaje (`vite` + `wrangler dev`)

### Faza 1 — Pionowe przebicie: zadanie → cron → push (KRYTYCZNE, najpierw)
- [ ] P1: **Spike** — udowodnić wysyłkę Web Push z Workera (Web Crypto, biblioteka Workers-compatible)
- [ ] P1: VAPID — wygenerować klucze; prywatny jako sekret, publiczny do frontu
- [ ] P1: Endpointy `POST/GET /api/tasks`, `POST /api/subscribe`
- [ ] P1: Handler `scheduled` + Cron co minutę (wybór zadań „do przypomnienia teraz", `reminded_at`)
- [ ] P1: Front — formularz zadania (data+godzina), zgoda na push, subskrypcja, SW (`injectManifest`)
- [ ] P1: Deploy na Pages+Worker → test push na realnym Androidzie (zamknięta apka, punktualność)
- [ ] P1: Obejście optymalizacji baterii (instrukcja + weryfikacja)

### Faza 2 — Zadania w pełni
- [ ] P2: Zakładka „Zadania" (nadchodzące) + edycja/usuwanie + toggle „zrobione"
- [ ] P2: Wyróżnienie zaległych
- [ ] P2: Widok „Dziś" (dzisiejsze + zaległe + szybki guzik pomysłu)

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
