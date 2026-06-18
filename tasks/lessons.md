# Personal Organizer — Lessons

Wzorce specyficzne dla tego projektu (stack Cloudflare + PWA + Web Push). Wzorce przekrojowe → `ai-os/knowledge/inbox.md`.

## 2026-06-16 — Web Push z Workera da się testować lokalnie (mimo antywirusa)
**Co:** Wysyłka Web Push z lokalnego `wrangler dev` (workerd) do FCM zwróciła **status 201** na tej maszynie,
mimo że antywirus przechwytuje HTTPS i psuje weryfikację certyfikatu w npm/Node.
**Dlaczego ważne:** Wcześniej zakładałem, że push-send sprawdzimy dopiero po deployu (bo AV). Okazało się,
że runtime Workera (workerd/miniflare) dogaduje się z FCM lokalnie — więc **całą logikę wysyłki push można
de-ryzykować lokalnie**, bez konta Cloudflare. Na telefon (Android, zamknięta apka, punktualność cronu)
trzeba deployu, ale samo „czy payload jest poprawny i przyjęty (201)" — lokalnie.
**Jak stosować:** Spike'y integracji z zewnętrznym API rób najpierw lokalnie nawet jeśli środowisko ma
przeszkody (AV) — sprawdź realnie zamiast zakładać, że się nie da. Oszczędza to przedwczesny deploy.

## 2026-06-16 — Pełny schemat v1 w Fazie 0 → kolejne fazy bez migracji D1
**Co:** Faza 3 (pomysły + projekty) nie wymagała żadnej migracji — tabele `projects`/`ideas` (z `project_id`
nullable→Skrzynka) były zdefiniowane już w `0001_init.sql` przy Fazie 0. Faza 3 = tylko endpointy Workera + front.
**Dlaczego ważne:** Domknięcie całego schematu v1 na starcie (mimo że funkcje dochodzą fazami) eliminuje
ceremonię migracji w trakcie i ryzyko rozjazdu local/remote D1.
**Jak stosować:** Dla pozostałych funkcji v1 (eksport, ewentualne pola) sprawdź najpierw `0001_init.sql` —
prawdopodobnie nie trzeba migracji, wystarczy endpoint + UI. Nową migrację rób tylko gdy realnie brakuje kolumny/tabeli.

## 2026-06-16 — NODE_OPTIONS=--use-system-ca jest obowiązkowe dla npm/wrangler tutaj
**Co:** Każda komenda npm/npx/wrangler sięgająca sieci pada na `UNABLE_TO_VERIFY_LEAF_SIGNATURE`,
dopóki nie ustawi się `NODE_OPTIONS=--use-system-ca` (Node używa wtedy magazynu certyfikatów Windows).
**Jak stosować:** Prefiksuj komendy w tym repo `$env:NODE_OPTIONS="--use-system-ca"`. Globalny kontekst
tego problemu: pamięć `project_node_https_av_interception`.

## 2026-06-17 — Deploy w chmurze (Workers Builds + GitHub) omija antywirusa całkowicie
**Co:** Lokalny `wrangler deploy` cierpi przez AV (Avast+Norton, przechwytywanie HTTPS). Zamiast walczyć z tym,
przełączyliśmy deploy na **Workers Builds podpięte do repo GitHub**: push na `main` → Cloudflare buduje i deployuje
**u siebie na Linuxie** (zero AV, zero lokalnego toolchainu sieciowego). Konfiguracja: root dir `worker`,
build `npm run ci:build` (instaluje deps web+worker, buduje front), deploy `npx wrangler deploy`. Skrypt `ci:build`
dodany do `worker/package.json`. Wszystko inne (D1, schemat, sekrety) klikane w panelu — bez terminala.
**Dlaczego ważne:** Przeszkoda środowiskowa (AV) nie musi blokować dowozu — przeniesienie buildu do CF cloud
rozwiązuje ją u źródła. Git push działa mimo AV (inny magazyn cert / schannel). Lokalny dev wciąż wymaga
`--use-system-ca`, ale to osobna sprawa od deployu.
**Jak stosować:** Następne deploye = `git push` (z VS Code Source Control albo przez agenta). Nie wracaj do
lokalnego `npm run deploy`, chyba że świadomie. Zmiana database_id/wrangler.toml → commit+push → auto-redeploy.

## 2026-06-17 — „Push nie działa" okazało się „nie było czego wysłać" (diagnozuj input, nie tylko pipeline)
**Co:** Objaw „powiadomienia nie działają". Zamiast od razu grzebać w VAPID/cronie, rozdzieliłem łańcuch:
subskrypcje w D1 (`SELECT COUNT(*) FROM push_subscriptions` = 2 → klient OK) vs zadania (`tasks` PUSTA → brak
kandydata do push). Sedno: cron nie miał czego wysłać, bo nie było zadania z terminem. Po utworzeniu poprawnego
zadania push przyszedł.
**Dlaczego ważne:** Zanim uznasz pipeline za zepsuty, potwierdź że jest prawidłowy INPUT, który ma przez niego
przepłynąć. Tania kwerenda do bazy lokalizuje warstwę awarii szybciej niż zgadywanie po stronie wysyłki.
**Jak stosować:** Przy „X nie działa" w łańcuchu zdarzeń — najpierw zweryfikuj dane wejściowe na każdym etapie
(jest subskrypcja? jest rekord-trigger? ma właściwe flagi?), potem dopiero podejrzewaj mechanizm.

## 2026-06-17 — Reużyj natywnej zależności z drugiego pakietu monorepo zamiast instalować nową
**Co:** Do wygenerowania ikon PWA (SVG→PNG) potrzebny był `sharp`. Zamiast instalować go w `web/` (ciężki natywny
pakiet, dodatkowe ryzyko pod AV), wykorzystałem `sharp` już obecny w `worker/node_modules` — skrypt
`web/scripts/generate-icons.mjs` rozwiązuje go przez `createRequire(path.resolve(__dirname, "../../worker/package.json"))`.
Dodatkowo geometria znaku „Postęp" jest **wklejona w skrypt** (nie czytana z `design/`), bo `design/` jest gitignore'owany
— dzięki temu skrypt i regeneracja są samowystarczalne i committowalne.
**Dlaczego ważne:** W monorepo natywna zależność zainstalowana w jednym workspace jest dostępna dla jednorazowych
skryptów w innym — bez dublowania instalacji i bez nowego wektora problemów ze środowiskiem (AV/cert). Wklejenie
danych źródłowych do skryptu uniezależnia artefakt od plików spoza repo.
**Jak stosować:** Jednorazowy skrypt potrzebuje paczki, która już gdzieś w repo jest? `createRequire` z `package.json`
tamtego workspace zamiast `npm install`. Jeśli skrypt zależy od czegoś gitignored — zinline'uj to, by działał bez tego pliku.

## 2026-06-17 — D1 Console spłaszcza wklejany SQL — komentarze `--` zjadają resztę polecenia
**Co:** Wklejenie migracji `0002_routines.sql` (wieloliniowa z komentarzami `--`) w D1 Console padło z `incomplete input:
SQLITE_ERROR`. Konsola spłaszcza wklejony tekst do jednej linii, a komentarz `--` obejmuje wszystko do końca linii —
po spłaszczeniu domknięcie definicji (`created_at ... )`) wpadło „pod komentarz", więc SQLite widział niedokończone
polecenie. Fix: wklejona ta sama definicja **bez komentarzy, w jednej linii** — wykonała się od razu.
**Dlaczego ważne:** Schemat w tym projekcie zakładamy ręcznie przez D1 Console (nie `wrangler migrations apply`).
Plik migracji w repo trzymamy z komentarzami (czytelność, `wrangler` je ogarnia), ale do ręcznego wklejania trzeba
wersji „gołej". To stały tarcie tego flow przy każdej nowej tabeli.
**Jak stosować:** Wklejasz DDL do D1 Console → usuń komentarze `--` i zbij w jedną linię (albo upewnij się, że żaden
`--` nie poprzedza dalszej części polecenia). Komentarze zostaw w pliku migracji w repo, nie w tym, co lecisz do Console.
