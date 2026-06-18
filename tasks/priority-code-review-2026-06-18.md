# Priorytet: problemy znalezione w code review — 2026-06-18

**Status:** PRIORITY / P1  
**Zakres:** krytyczne ścieżki produkcyjne oraz commity `fd30cad` i `cd9e982`  
**Tryb:** recenzja read-only; kod produktu nie został zmieniony

## Podsumowanie

Aplikacja buduje się poprawnie, a jej główna architektura jest zdrowa. Review wykazało jednak dwie luki P1
w niezawodności powiadomień. Powinny zostać naprawione przed wdrożeniem kalendarza, ponieważ przypomnienia są
jedną z głównych obietnic produktu.

Rekomendowana kolejność:

1. Naprawić potwierdzanie dostarczenia push i zachowanie retry.
2. Weryfikować i naprawiać subskrypcję push przy uruchomieniu aplikacji.
3. Dodać skupione testy regresyjne dla obu przypadków.
4. Naprawić problemy integralności i bezpieczeństwa danych.
5. Posprzątać mniej pilne problemy nawigacji i dokumentacji.

## P1 — do naprawy przed nowymi funkcjami

### 1. Przypomnienie jest oznaczane jako wysłane mimo nieudanej wysyłki

**Lokalizacja:** `worker/src/index.ts:290-305`

**Problem:** Handler crona ustawia `reminded_at` po przejściu przez subskrypcje niezależnie od wyników wysyłki.
Dzieje się tak również wtedy, gdy nie ma żadnej subskrypcji, wszystkie wywołania rzucą wyjątek albo push service
zwróci wyłącznie błędy, np. 429 lub 500.

**Skutek:** Zadanie przestaje kwalifikować się do kolejnych uruchomień crona, mimo że użytkownik nie dostał
powiadomienia.

**Wymagana poprawka:**

- Śledzić, czy przynajmniej jeden push service zwrócił sukces 2xx.
- Ustawiać `reminded_at` dopiero po co najmniej jednym przyjętym powiadomieniu.
- Zachowywać zadanie do ponowienia po wyjątku i statusie przejściowym.
- Nadal usuwać martwe subskrypcje po 404 lub 410.
- Logować błąd wraz z ID zadania i statusem, bez sekretów oraz kluczy subskrypcji.

**Weryfikacja:**

- Odpowiedź 201 ustawia `reminded_at`.
- Wyjątek pozostawia `reminded_at` puste.
- 429/500 pozostawia `reminded_at` puste.
- Brak subskrypcji pozostawia `reminded_at` puste.
- 404/410 usuwa martwą subskrypcję i nie udaje skutecznego dostarczenia.

### 2. UI utożsamia zgodę przeglądarki z aktywną subskrypcją push

**Lokalizacje:** `web/src/lib/push.ts:15-44`, `web/src/features/Today.tsx:34`

**Problem:** Front uznaje push za aktywny, gdy `Notification.permission === "granted"`. Nie sprawdza, czy
`pushManager.getSubscription()` zwraca aktualną subskrypcję zsynchronizowaną z backendem.

**Skutek:** Przycisk włączenia może zniknąć, mimo że powiadomienia nie są już dostarczalne — np. po wygaśnięciu
subskrypcji, odtworzeniu D1 albo usunięciu endpointu przez backend po 410.

**Wymagana poprawka:**

- Przy starcie sprawdzać prawdziwą subskrypcję przeglądarki.
- Ponownie rejestrować istniejącą subskrypcję przez `/api/subscribe`.
- Pokazywać push jako aktywny dopiero po udanej synchronizacji.
- Dodać możliwość naprawy lub ponownego włączenia, najlepiej w Ustawieniach.

**Weryfikacja:**

- Zgoda i poprawna subskrypcja pokazują stan aktywny.
- Zgoda bez subskrypcji umożliwia naprawę i tworzy subskrypcję.
- Błąd synchronizacji backendu nie pokazuje push jako aktywnego.

## P2 — bezpieczeństwo i integralność danych

### 3. Nieprawidłowy `project_id` może utworzyć niewidoczny pomysł

**Lokalizacja:** `worker/src/index.ts:207-237`

**Problem:** Endpointy tworzenia i edycji pomysłów akceptują dowolny numeryczny `project_id`. Schemat nie ma
ograniczenia foreign key, a API nie sprawdza istnienia projektu.

**Skutek:** Stary lub ręcznie podany identyfikator może utworzyć osierocony pomysł. Widok Pomysłów renderuje tylko
znane projekty i grupę `null`, więc taki rekord staje się niewidoczny w normalnym UI.

**Wymagana poprawka:**

- Dla `project_id !== null` sprawdzać istnienie projektu przed INSERT lub UPDATE.
- Dla nieznanego projektu zwracać 400 albo 404.
- Migrację z foreign key rozważyć później, tylko jeśli będzie zgodna z ręcznym procesem migracji D1.

**Weryfikacja:**

- Istniejący projekt działa.
- `null` działa i umieszcza pomysł w „Ogólne”.
- Nieznany projekt jest odrzucany i nie tworzy rekordu.

### 4. Destrukcyjne akcje kasują dane jednym dotknięciem

**Lokalizacje:**

- `web/src/features/TaskRow.tsx:147-153`
- `web/src/features/IdeaItem.tsx:109-111`
- `web/src/features/RoutineRow.tsx:127-135`

**Problem:** Dotknięcie małej ikony usuwania natychmiast kasuje rekord. Nie ma potwierdzenia, cofnięcia, kosza ani
automatycznego backupu.

**Skutek:** Przypadkowe dotknięcie na telefonie może spowodować trwałą utratę danych.

**Wymagana poprawka:** Jako najmniejszą bezpieczną zmianę dodać potwierdzenie. Lepszym UX byłby opóźniony DELETE
ze snackbar-em „Cofnij”, ale to większy zakres.

**Weryfikacja:** Anulowanie zachowuje rekord; potwierdzenie kasuje go dokładnie raz.

## P3 — odporność i utrzymanie

### 5. Przycisk „Wstecz” z Ustawień może opuścić PWA

**Lokalizacja:** `web/src/components/Layout.tsx:31-38`

**Problem:** Przycisk zawsze wywołuje `navigate(-1)`.

**Skutek:** Jeżeli `/settings` jest pierwszym wpisem historii po odświeżeniu lub przywróceniu PWA, akcja może nic
nie zrobić, zamknąć okno standalone albo przejść poza aplikację.

**Wymagana poprawka:** Przekazywać route źródłowy w navigation state i używać `/` jako fallback. Najmniejsza
alternatywa to bezpośrednie `navigate("/")`.

### 6. Instrukcje projektu opisują nieaktualny mechanizm auth

**Lokalizacja:** `CLAUDE.md:13`

**Problem:** Instrukcje nadal wskazują Cloudflare Access jako aktywny auth. Wdrożona aplikacja korzysta ze statycznego
tokenu Bearer, co potwierdzają implementacja, `tasks/todo.md` i stan AI OS.

**Skutek:** Kolejna sesja może podjąć decyzje niezgodne z service workerem i rzeczywistą architekturą bezpieczeństwa.

**Wymagana poprawka:** Zaktualizować `CLAUDE.md` dopiero po osobnym potwierdzeniu użytkownika, ponieważ jest to
konstytucyjny plik instrukcji projektu.

### 7. Komentarz CSS wywołuje ostrzeżenie produkcyjnego buildu

**Lokalizacja:** `web/src/index.css:6`

**Problem:** Tekst `bg-*/text-*/border-*` zawiera `*/`, co przedwcześnie kończy komentarz CSS. Reszta tekstu jest
następnie analizowana jak nieprawidłowy CSS.

**Skutek:** Build obecnie przechodzi, ale emituje ostrzeżenie parsera i może stać się bardziej kruchy po aktualizacji
toolchainu.

**Wymagana poprawka:** Przepisać komentarz bez sekwencji `*/`.

### 8. Brak automatycznych testów regresyjnych

**Zakres:** `web/`, `worker/`

**Problem:** Repo nie zawiera testów jednostkowych ani integracyjnych. Obecne warstwy weryfikacji to build, lint,
typecheck oraz dogfooding na żywo.

**Skutek:** Regresje w obsłudze awarii crona, odnawianiu subskrypcji, konwersji dat i walidacji API mogą przejść
wszystkie obecne kontrole.

**Wymagana poprawka:** Zacząć od wąskich testów dwóch problemów P1 oraz walidacji projektu. Nie robić szerokiej
migracji testowej, dopóki nie zostanie wybrany najmniejszy odpowiedni setup dla Workera i frontu.

## Weryfikacja wykonana podczas review

- Produkcyjny build frontu: przeszedł.
- ESLint: przeszedł.
- Typecheck Workera: przeszedł.
- Skan sekretów: brak oczywistych sekretów w repo.
- Ostatnie zmiany w `fd30cad` i `cd9e982`: sprawdzone.
- Istniejące zmiany w `tasks/todo.md` i `tasks/lessons.md`: zachowane.

## Co jest dobrze

- Wszystkie endpointy `/api/*` chroni middleware tokenu Bearer.
- Wartości SQL są przekazywane przez parametry.
- Formularze zachowują treść użytkownika po nieudanym zapisie.
- Migracja priorytetów ma bezpieczną wartość domyślną, a API ogranicza wartości.
- Service worker poprawnie używa `event.waitUntil()` dla push i kliknięcia powiadomienia.
- Architektura produkcyjna i deploy są jasno opisane poza nieaktualną linią auth w `CLAUDE.md`.

## Kryteria zakończenia

- [ ] Naprawione potwierdzanie dostarczenia i retry przypomnienia P1.
- [ ] Naprawiona weryfikacja i odbudowa subskrypcji P1.
- [ ] Dodane i przechodzące skupione testy regresyjne.
- [ ] Nieprawidłowy `project_id` pomysłu jest odrzucany.
- [ ] Akcje usuwania są zabezpieczone przed przypadkowym dotknięciem.
- [ ] Powrót z Ustawień ma fallback wewnątrz aplikacji.
- [ ] Usunięte ostrzeżenie CSS.
- [ ] Opis auth w `CLAUDE.md` zaktualizowany po zgodzie użytkownika.
- [ ] Build, lint, typecheck Workera i właściwe testy przechodzą.
- [ ] Zmiany zweryfikowane na produkcyjnym Android PWA po wdrożeniu.
