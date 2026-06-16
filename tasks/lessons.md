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

## 2026-06-16 — NODE_OPTIONS=--use-system-ca jest obowiązkowe dla npm/wrangler tutaj
**Co:** Każda komenda npm/npx/wrangler sięgająca sieci pada na `UNABLE_TO_VERIFY_LEAF_SIGNATURE`,
dopóki nie ustawi się `NODE_OPTIONS=--use-system-ca` (Node używa wtedy magazynu certyfikatów Windows).
**Jak stosować:** Prefiksuj komendy w tym repo `$env:NODE_OPTIONS="--use-system-ca"`. Globalny kontekst
tego problemu: pamięć `project_node_https_av_interception`.
