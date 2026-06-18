# Personal Organizer — Project Instructions

Osobisty organizer na telefon (Android, PWA). Jedno własne miejsce: zadania z terminami + push, szybki przechwyt pomysłów, widok „Dziś". Budowany razem z agentem jako nauka + portfolio.

> Zasady ogólne (komunikacja PL, kod EN, model routing, delegacja, git) dziedziczy z nadrzędnego `../CLAUDE.md`. Poniżej tylko to, co specyficzne dla tego projektu.

## Stack
- **Front:** React + Vite, jako PWA (instalowana na ekran główny). BEZ Next.js (świadoma decyzja — bez SSR/App Router/server components).
- **Backend:** Cloudflare Workers.
- **Baza:** Cloudflare D1 (SQLite).
- **Scheduler:** Cloudflare Cron Triggers (budzi Workera, który wysyła push).
- **Powiadomienia:** Web Push (VAPID) + service worker w przeglądarce telefonu.
- **Auth (v1):** token aplikacyjny (Bearer) + własne middleware Workera — tylko właściciel. NIE Cloudflare Access (to parking v2+, patrz mapa drogowa #12).

## Twarde ograniczenia
- **$0 utrzymania.** Zero płatnych API. Wszystko na darmowych tierach Cloudflare. Jeśli coś grozi kosztem — STOP i zapytaj.
- **Bez AI w produkcie w v1** (wariant „agent w narzędziu" = v2+). Ale architektura ma nie zamykać do niego drogi.
- Jeden użytkownik. Bez wieloużytkownikowości, kont zespołowych, współdzielenia.
- Cel: Android. iOS nie jest celem.

## Konwencje
- Sekrety (klucze VAPID itp.) tylko w `.env` / sekretach Cloudflare — nigdy w kodzie, logach, commitach.
- Front (React) nigdy nie sięga do bazy bezpośrednio — zawsze przez API Workera.
- Trzymać v1 chudo: codzienne użycie > liczba funkcji. Nowe funkcje to ćwiczenia z self-extend, dokładane po dowiezieniu rdzenia.

## Zakres v1 (rdzeń)
1. Zadania z terminem + powiadomienie push o czasie.
2. Szybki przechwyt pomysłów (treść + timestamp + opcjonalny tekstowy „projekt").
3. Widok „Dziś" (zadania na dziś + szybki guzik dorzucenia pomysłu).

## Świadomie na później (v2+)
Projekty/tagi jako moduł, zadania cykliczne, pomysł→zadanie jednym klikiem, widok kalendarza, wariant B (AI w środku), eksport/backup danych (priorytet wczesny — patrz todo).
