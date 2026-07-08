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

**Repo czyste i zsynchronizowane z `origin/main`** (ostatni commit pracy: sesja 18, `9fa06fb`).
Cała mapa drogowa P1/P2/P3 dowieziona i potwierdzona na żywo (m.in. lag startowy i ekran gratulacji
potwierdzone przez usera 2026-06-30). Świadomie skreślone: pomysł→zadanie (#4), sekcja „Bez terminu" (#7),
tagi i statystyki (łamią linie cięcia v1).

**Faza bieżąca:** „używaj i zbieraj tarcie" — NIE budować z góry; kolejna funkcja dopiero, gdy realne
użycie wskaże konkretny ból. Otwarte pytania do oceny w użyciu żyją w `state.md` (Open questions), nie tu.

⚠️ Środowisko (tylko LOKALNY dev): npm/wrangler wymaga `NODE_OPTIONS=--use-system-ca` (Avast+Norton przechwytują HTTPS).
Deploy NIE używa lokalnego toolchainu. Migrację D1 zakładaj PRZED pushem (push = natychmiastowy auto-redeploy na prod).

## Otwarte pozycje

### Zbiorcze usuwanie wykonanych zadań — zaimplementowane lokalnie, czeka na deploy
- [x] Dodać chroniony endpoint usuwający wszystkie zwykłe zadania ze statusem `done`.
- [x] Dodać dwustopniowy przycisk „Usuń wykonane (N)” w trybie „Zadania”.
- [x] Potwierdzić testami, lintem i buildem, że rutyny oraz pozostałe zachowania są nietknięte.

### Weryfikacje na telefonie (klik usera — kod nie wykona)
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
