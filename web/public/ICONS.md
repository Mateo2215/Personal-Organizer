# Ikony PWA — do dostarczenia z Claude Design

Pliki ikon tworzymy w **Claude Design** (osobny program) i wrzucamy do tego katalogu (`web/public/`).
Manifest (`vite.config.ts`) oraz `index.html` już je referują pod poniższymi nazwami — wystarczy podmienić pliki,
nic w kodzie nie trzeba zmieniać.

## Wymagane pliki

| Plik | Rozmiar | Przeznaczenie |
|---|---|---|
| `icon-192.png` | 192×192 | Minimum instalowalności PWA |
| `icon-512.png` | 512×512 | Splash / wysoka rozdzielczość |
| `icon-512-maskable.png` | 512×512 | Ikona „maskable" na ekranie głównym Androida |
| `apple-touch-icon.png` | 180×180 | Skrót na iOS (iOS nie jest celem, ale tani bonus) |

## Wytyczne wizualne (spójne z designem apki)
- Tło: ciemne (`#0a0a0a`), zgodne z `theme_color` / `background_color` manifestu.
- Jeden kolor akcentu (do ustalenia w pass-ie designem A4).
- **Maskable:** trzymaj symbol w centralnym „bezpiecznym polu" (~80% szerokości), bo Android przycina rogi.
- Prosty, czytelny symbol w małym rozmiarze (organizer / zadania).
