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

## 2026-06-18 — Zmiana schematu: migracja w D1 PRZED pushem (push = natychmiastowy auto-redeploy na prod)
**Co:** Deploy to Workers Builds podpięte do `main` — `git push` od razu buduje i wdraża nową wersję na produkcję,
która jest w realnym codziennym użyciu. Gdy commit dodaje kolumnę (`ideas.priority`) i kod jej używa (INSERT/PATCH),
a migracja `0003` nie jest jeszcze w D1, to świeży kod trafia na bazę bez kolumny → dodawanie/edycja pomysłów sypie
błędem (odczyt przez `SELECT *` przeżyje, zapis nie). Kolejność jest krytyczna: **najpierw migracja w D1 Console,
dopiero potem push.**
**Dlaczego ważne:** Nie ma „okna" między pushem a deployem do ręcznego dołożenia migracji — redeploy jest
automatyczny. Przy żywej apce to nie jest hipoteza, tylko realna chwilowa awaria funkcji. Dlatego przed pushem zmiany
schematu pytam wprost: „czy migracja już jest w D1?" — i bramkuję push tą odpowiedzią.
**Jak stosować:** Commit dotyka schematu? Sekwencja: (1) załóż migrację w D1 Console (gołe DDL, jedna linia — patrz
lekcja wyżej), (2) potwierdź że weszła, (3) dopiero push. Zmiana front-only / bez nowej kolumny → push bezpieczny od ręki.

## 2026-06-18 — Prosty `"` w polskim stringu JSX przedwcześnie zamyka literał
**Co:** W stringu `"...na ekranie „Dziś". Zapisane..."` cudzysłów po `Dziś` był PROSTY (`"`, U+0022), nie krzywy (`"`),
więc zamknął literał JS w środku zdania → `tsc` TS1005 „'}' expected". Reszta zdania stała się błędnym tokenem.
**Dlaczego ważne:** UI jest po polsku, więc krzywe `„…"` są wszędzie; o pomyłkę (jeden prosty cudzysłów w stringu
delimitowanym prostym `"`) bardzo łatwo, a komunikat tsc wskazuje mylące miejsce (koniec zdania, nie sam cudzysłów).
**Jak stosować:** W stringach JS delimitowanych `"` nie wstawiaj prostych `"` w treści — użyj krzywych `„…"`, backticków
albo usuń wewnętrzne cudzysłowy. Build (`tsc -b`) łapie to od razu — uruchamiaj po każdej partii zmian w UI.

## 2026-06-18 — Udany happy path push nie potwierdza bezpiecznej obsługi awarii
**Co:** Push został potwierdzony na realnym Androidzie, ale code review wykazał, że cron ustawia `reminded_at` również wtedy,
gdy nie ma subskrypcji albo wszystkie wysyłki zawiodą. Live test potwierdził ścieżkę sukcesu, lecz nie semantykę retry.
**Dlaczego ważne:** Przypomnienia są główną obietnicą produktu. Jednorazowy sukces produkcyjny nie zabezpiecza przypadków
timeout, 429/500, martwej subskrypcji ani pustej listy odbiorców.
**Jak stosować:** Dla krytycznych pipeline'ów testuj osobno: sukces, błąd przejściowy, błąd trwały i brak odbiorcy. Stan
„obsłużone" zapisuj dopiero po jednoznacznym potwierdzeniu sukcesu, a nie po samym zakończeniu pętli.

## 2026-06-18 — Testowalność = ekstrakcja do czystej funkcji; logika inline w handlerze Hono jest droga w teście
**Co:** Dwie poprawki P1 (retry crona, synchronizacja subskrypcji) dało się tanio pokryć testami, bo logika żyła w
czystych funkcjach z wstrzykiwanymi zależnościami (`scheduler.ts`, `push.ts`) — 15 testów Vitest bez mocka HTTP/D1.
Walidacja `project_id` siedzi natomiast inline w handlerze `app.post/patch("/api/ideas")`; sensowny test wymagałby
`app.request()` + mocka `c.env.DB` (prepare/bind/first) + nagłówka Bearer pod middleware auth — dużo rusztowania
dla jednego `SELECT`. Świadomie odpuszczono test, zostawiając go jako ewentualny P3.
**Dlaczego ważne:** „Czy to przetestować?" zależy nie od wagi findingu, lecz od kosztu rusztowania. Logika wpleciona
w handler/kontroler ma ukryty koszt: żeby ją dotknąć testem, musisz postawić cały request + środowisko. Ta sama logika
w eksportowanej czystej funkcji jest testowalna za darmo.
**Jak stosować:** Jeśli fragment logiki chcesz móc testować (albo już wiesz, że to ścieżka krytyczna), wyekstrahuj go
z handlera do czystej funkcji z wstrzykiwanymi zależnościami — jak `processTaskReminders`. Dla trywialnej walidacji
inline (jeden `SELECT`, clamp) test bywa droższy niż wart; wtedy oprzyj się na tsc + buildzie i odnotuj świadomą rezygnację.

## 2026-06-18 — Smoke test D1 z JSON na Windows: użyj `--file`, nie wieloliniowego `--command`
**Co:** Przy lokalnym teście importu `wrangler d1 execute --command` uruchomił tylko pierwszą linię wieloliniowego SQL,
a jednowierszowy argument z JSON został zniekształcony przez quoting natywnego procesu Windows (`malformed JSON`).
Ten sam SQL wykonany przez `--file` w ignorowanym `.tmp/` przeszedł jako 8 poleceń i poprawnie odtworzył dane.
**Dlaczego ważne:** Import używa `json_each(?)`, więc test musi zachować cudzysłowy JSON i granice wszystkich instrukcji.
Błąd warstwy CLI może wyglądać jak błąd SQLite lub kodu Workera, mimo że przygotowane zapytania są poprawne.
**Jak stosować:** Dłuższy SQL lub JSON do lokalnej D1 na Windows zapisuj w jednorazowym pliku `.tmp/*.sql` i uruchamiaj
przez `wrangler d1 execute ... --file`. `--command` zostaw dla krótkich, pojedynczych zapytań bez złożonego quotingu.

## 2026-06-19 — Licznik w UI i harmonogram backendu to dwa niezależne zegary
**Co:** Przy planowaniu „za X do zadania" łatwo założyć, że minutowe odświeżanie zwiększy liczbę uruchomień crona
lub requestów do Cloudflare. W rzeczywistości licznik może działać lokalnie w otwartej PWA przez jeden timer na widok,
podczas gdy Worker nadal uruchamia ten sam cron co minutę i jedynie inaczej wylicza moment kwalifikacji zadania.
**Dlaczego ważne:** Rozdzielenie prezentacji czasu od dostarczenia push pozwala dodać żywy UX bez kosztu sieciowego,
nowych triggerów i komplikowania krytycznego pipeline'u przypomnień.
**Jak stosować:** Dynamiczne etykiety czasu licz po stronie klienta z jednego współdzielonego zegara. Backend angażuj
tylko wtedy, gdy zmienia się stan lub trzeba wykonać akcję; nie twórz osobnych timerów ani requestów dla każdego wiersza.

## 2026-06-19 — Zdrowie deploya Workers czytaj z „Active deployment" (Error Rate), nie z „Errors by version"
**Co:** Po pushu Observability/Logs były niedostępne. Wykres „Errors by version" pokazał 1 błąd — ale przypisany
do NIEAKTYWNEJ wersji w okolicy czasu deploya. Panel „Active deployment" pokazywał aktywną wersję z Error Rate 0%,
100% ruchu. Czyli żywa wersja była zdrowa, a pojedynczy słupek dotyczył wersji, która już nie obsługuje ruchu.
**Dlaczego ważne:** Bez dostępu do Logs łatwo spanikować pojedynczym błędem na wykresie i szukać regresji, której
nie ma na produkcji. Błąd na innej wersji w momencie przełączania to zwykle szum rolloutu, nie defekt nowego kodu.
**Jak stosować:** Po pushu czytaj Deployments → „Active deployment" → Error Rate jako sygnał zdrowia żywej wersji.
Błąd przypisany do nieaktywnej wersji w okolicy czasu deploya traktuj jako rollover noise, dopóki aktywna ma 0%.
Logi pojedynczego błędu ścigaj tylko, gdy Error Rate aktywnej wersji rośnie. (Observability na Workers Free bywa
wyłączone — to opcja, nie wada deploya.)

## 2026-06-19 — Nowa wartość enuma w kolumnie bez CHECK = migracja TYLKO danych, nie schematu
**Co:** Dodanie 4. stanu priorytetu pomysłu („bez" = 0, nowy domyślny) wyglądało na zmianę schematu, ale `ideas.priority`
to gołe `INTEGER NOT NULL DEFAULT 1` bez CHECK, a aplikacja **zawsze** podaje wartość jawnie (INSERT/PATCH przez
`clampPriority`). Więc: (1) `0` było storowalne od zawsze — żadnego ALTER nie trzeba; (2) kolumnowy DEFAULT nigdy nie
jest używany przez kod, więc jego zmiana (1→0) jest bez znaczenia w praktyce; (3) jedyne, co realnie wymagało ruchu,
to **dane** — `UPDATE ideas SET priority = 0 WHERE priority = 1`, by stare nieoznaczone pomysły nie zaświeciły nowym
kolorem „niski". Migracja `0005` to czysty UPDATE, zero DDL.
**Dlaczego ważne:** Odruch „nowy stan enuma → migracja schematu" prowadzi do niepotrzebnego ALTER (a w SQLite zmiana
DEFAULT/CHECK to przebudowa tabeli — droga i ryzykowna). Gdy walidacja żyje w warstwie aplikacji, baza często nic nie
wie o „dozwolonym zbiorze", więc rozszerzenie zbioru jej nie dotyczy.
**Jak stosować:** Dodajesz wartość do enuma trzymanego jako INTEGER/TEXT? Najpierw sprawdź, czy kolumna ma CHECK i czy
kod podaje wartość jawnie. Jeśli nie ma CHECK i wartość zawsze jest podawana — pomiń migrację schematu; rozważ tylko
**UPDATE remapujący istniejące wiersze** (gdy zmiana znaczeń/kolorów dotyka starych danych). Pamiętaj o spójności na
brzegach: walidacja API (`clampPriority`) i parser importu muszą dopuścić nową wartość — import też zmapuj (legacy bez
pola → nowy domyślny).

## 2026-06-19 — Stan „skończone" musi mieć pierwszeństwo przed stanem „pusto"
**Co:** Dodając ekran gratulacji na „Dziś" (`DayComplete`) okazało się, że gdy masz tylko zadania z terminem (bez rutyn)
i odhaczysz wszystkie, listy w widoku robią się puste → `isEmpty` zapala stan „Czysto na dziś" (komunikat od *pustego*
dnia). Czyli „skończyłem wszystko" było nieodróżnialne od „nic nie było zaplanowane". Fix: warunek sukcesu liczony
z **liczników** (`dayTotal > 0 && dayDoneTotal === dayTotal`) renderowany PRZED gałęzią `isEmpty` (`isEmpty && !dayComplete`).
**Dlaczego ważne:** „Pusto" zwykle wyprowadza się z *długości list* (`items.length === 0`), a „skończone" z *liczników
zrobione/wszystkie*. Te dwa stany **zbiegają się**, bo ukończenie opróżnia listy (przefiltrowane `status==="open"`
znika). Bez jawnego pierwszeństwa sukces wpada w „pusto" i znika nagroda.
**Jak stosować:** W każdym widoku listy z odhaczaniem rozróżniaj „nic nie było" (total === 0) od „wszystko zrobione"
(total > 0 && done === total). Renderuj/sprawdzaj stan ukończenia przed stanem pustym. Stan sukcesu wiąż z licznikami,
nie z `list.length`, bo lista po ukończeniu i tak będzie pusta.
