# Deploy — Personal Organizer (Faza 4, Blok B)

Architektura: **jeden Worker serwuje front + API** (Workers Static Assets). Front buduje się do `web/dist`,
Worker (`worker/`) serwuje te pliki i obsługuje `/api/*`. Jeden adres, zero CORS.

> **Środowisko (Windows + antywirus):** KAŻDĄ komendę npm/wrangler odpalaj z `NODE_OPTIONS=--use-system-ca`,
> inaczej HTTPS pada na weryfikacji certyfikatu. W PowerShell: `$env:NODE_OPTIONS="--use-system-ca"` raz na sesję.

## Wymagania wstępne
- Konto Cloudflare (darmowe, **bez karty** — fail-closed: jeśli cokolwiek prosi o kartę, STOP).
- Sekrety VAPID + token — w `worker/.dev.vars` (lokalnie). Te same wartości wgramy do produkcji.

## Kroki (wykonujesz w katalogu `worker/`)

### B1 — Logowanie
```
npx wrangler login
```
Otworzy przeglądarkę, autoryzujesz konto. Jednorazowo.

### B2 — Utworzenie bazy D1
```
npx wrangler d1 create personal-organizer
```
Komenda zwróci `database_id`. **Wklej go** do `worker/wrangler.toml` w miejsce placeholdera
`00000000-0000-0000-0000-000000000000`.

### B3 — Sekrety (produkcyjne)
```
npx wrangler secret put APP_TOKEN          # długi LOSOWY ciąg, NIE "dev-local-token..."
npx wrangler secret put VAPID_PUBLIC_KEY   # z worker/.dev.vars
npx wrangler secret put VAPID_PRIVATE_KEY  # z worker/.dev.vars
npx wrangler secret put VAPID_SUBJECT      # z worker/.dev.vars (mailto:...)
```
> APP_TOKEN wpiszesz raz w apce (ekran „klucza dostępu"); siedzi w localStorage telefonu.
> Wygeneruj mocny token, np. w PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.

### B4 — Migracja schematu na zdalne D1
```
npx wrangler d1 migrations apply personal-organizer --remote
```
Utworzy tabele (`projects`, `tasks`, `ideas`, `push_subscriptions`) na produkcyjnej bazie.

### B5 — Deploy (build front + Worker)
```
npm run deploy
```
`predeploy` zbuduje front (`web/dist`), potem `wrangler deploy` wgra Workera RAZEM ze statykami i cronem.
Na końcu dostaniesz adres `https://personal-organizer-api.<konto>.workers.dev` — to PEŁNA apka (front + API).

## Po deployu → Blok C (weryfikacja na Androidzie)
1. Otwórz adres na telefonie → wpisz APP_TOKEN → „Dodaj do ekranu głównego" (PWA).
2. Włącz powiadomienia (subskrypcja push).
3. Utwórz zadanie na ~2 min do przodu → **zamknij apkę** → czekaj na push. Oceń punktualność.
4. Optymalizacja baterii: Ustawienia → Aplikacje → (przeglądarka/PWA) → Bateria → „Bez ograniczeń".
5. Kontrola $0: dashboard Cloudflare → Workers (requests), D1 (rozmiar/zapytania), cron (1440/dobę << limit).

## Uwaga o ikonach
Manifest referuje `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` w `web/public/`
(spec: `web/public/ICONS.md`). Powstają w **Claude Design**. Bez nich apka się wdroży i zadziała, ale instalacja
„na ekran główny" pokaże domyślną/pustą ikonę — wgraj pliki przed Blokiem C, żeby ikona była ładna.
