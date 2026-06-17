# Ikony PWA — generowane skryptem

Ikony powstają z logo „Postęp" (gradient Aurora + pierścień postępu z odhaczeniem) przez deterministyczny skrypt
`web/scripts/generate-icons.mjs` (rasteryzacja `sharp`). Geometria znaku jest wklejona w skrypt — nie zależy od
folderu `design/`. Manifest (`vite.config.ts`) i `index.html` referują pliki pod stałymi nazwami.

## Regeneracja
```
cd web && node scripts/generate-icons.mjs
```

## Pliki (w tym katalogu)
| Plik | Rozmiar | Przeznaczenie | purpose |
|---|---|---|---|
| `icon-192.png` | 192×192 | Minimum instalowalności PWA | any (squircle) |
| `icon-512.png` | 512×512 | Splash / wysoka rozdzielczość | any (squircle) |
| `icon-512-maskable.png` | 512×512 | Ekran główny Androida (system przycina) | maskable (pełny gradient) |
| `apple-touch-icon.png` | 180×180 | Skrót na iOS (bonus, iOS nie jest celem) | — |
| `favicon.svg` | wektor | Favicon (skaluje się 16–48 px) | — |

## Uwagi wizualne
- Wersje `any` to zaokrąglony kafelek (rogi przezroczyste) — jak ikona w samej apce.
- Maskable/apple to pełny kwadrat gradientu (system sam zaokrągla); znak w centralnych ~75% = w bezpiecznym polu.
- Kolory zgodne z tłem „Aurora": `theme_color`/`background_color` = `#0b0a12`.
