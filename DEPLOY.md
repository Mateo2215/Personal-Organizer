# Deploy — Personal Organizer (Faza 4, Blok B) — przez GitHub + panel Cloudflare

Apkę budujemy i wdrażamy **w chmurze Cloudflare prosto z repo na GitHubie** — nic nie kompiluje się
na lokalnym komputerze, więc antywirus (Avast/Norton, skanowanie HTTPS) nie ma tu nic do gadania.
Cały deploy to kilka kliknięć w przeglądarce + `git push` (robiony z VS Code lub przez agenta).

Architektura: **jeden Worker serwuje front + API** (Workers Static Assets). Front buduje się do `web/dist`,
Worker (`worker/`) serwuje te pliki i obsługuje `/api/*`. Jeden adres, zero CORS.

## Kolejność kroków

### B1 — Kod na GitHubie
Najnowszy commit musi być na `main` w `Mateo2215/Personal-Organizer`. (Push robi agent lub Ty z panelu
Source Control w VS Code — git nie jest blokowany przez antywirusa.)

### B2 — Utwórz bazę D1 (panel)
Dashboard Cloudflare → **Storage & Databases → D1 SQL Database → Create**.
- Nazwa: `personal-organizer`.
- Po utworzeniu skopiuj **Database ID** (długi ciąg).

### B3 — Wpisz Database ID do konfiguracji
W `worker/wrangler.toml` podmień placeholder `00000000-0000-0000-0000-000000000000` na skopiowane ID.
Commit + push (VS Code lub agent). Bez tego Worker nie połączy się z bazą.

### B4 — Załóż schemat bazy (panel)
Dashboard → D1 → `personal-organizer` → zakładka **Console**.
Wklej całą zawartość pliku `worker/migrations/0001_init.sql` i kliknij **Execute**.
To tworzy tabele: `projects`, `tasks`, `ideas`, `push_subscriptions`. Robi się raz.

### B5 — Podłącz repo jako Worker (Workers Builds)
Dashboard → **Workers & Pages → Create → Workers → Import a repository** (autoryzuj aplikację Cloudflare na GitHubie).
- Wybierz repo `Personal-Organizer`.
- **Production branch:** `main`
- **Root directory:** `worker`
- **Build command:** `npm run ci:build`
- **Deploy command:** `npx wrangler deploy`
- Zapisz → **Save and Deploy**.

Cloudflare sklonuje repo, zainstaluje zależności front+worker, zbuduje front i wgra Workera razem ze statykami i cronem.
Od teraz **każdy push na `main` = automatyczny redeploy**.

### B6 — Wgraj sekrety (panel)
Dashboard → Twój Worker → **Settings → Variables and Secrets → Add** (typ: **Secret**):
- `APP_TOKEN` — Twoje prywatne hasło do apki. **Długi, losowy** ciąg (NIE „dev-local-token..."). Wygeneruj np.
  w menedżerze haseł i zapisz — wpiszesz go raz na telefonie, apka go zapamięta.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — wartości z pliku `worker/.dev.vars` (skopiuj z niego).

Sekrety zostają między deployami (kolejny `wrangler deploy` ich nie kasuje). Po dodaniu sekretów apka jest gotowa.

## Po deployu → Blok C (weryfikacja na Androidzie)
Adres apki: `https://personal-organizer-api.<konto>.workers.dev` (pokaże się w panelu Workera).
1. Otwórz adres na telefonie → wpisz APP_TOKEN → „Dodaj do ekranu głównego" (PWA).
2. Włącz powiadomienia (subskrypcja push).
3. Utwórz zadanie na ~2 min do przodu → **zamknij apkę** → czekaj na push. Oceń punktualność.
4. Optymalizacja baterii: Ustawienia → Aplikacje → (przeglądarka/PWA) → Bateria → „Bez ograniczeń".
5. Kontrola $0: dashboard → Workers (requests), D1 (rozmiar/zapytania), cron (1440/dobę << limit). ⚠️ Karta = STOP.

## Uwaga o ikonach
Manifest referuje `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` w `web/public/`
(spec: `web/public/ICONS.md`). Powstają w **Claude Design**. Bez nich apka się wdroży i zadziała, ale ikona na ekranie
głównym będzie domyślna — wgraj pliki (commit + push) przed Blokiem C, żeby była ładna.
