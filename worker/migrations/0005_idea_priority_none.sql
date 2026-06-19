-- Dodanie 4. stanu priorytetu pomysłu: 0 = „bez" (nowy domyślny).
-- Kolory: bez = szary, niski = żółty, średni = pomarańczowy, wysoki = czerwony.
-- Schemat bez zmian (kolumna `priority` to zwykły INTEGER, aplikacja zawsze podaje wartość).
-- Migracja tylko danych: dotychczasowe nieoznaczone pomysły (stary domyślny niski=1, wyglądały na szaro/bez poświaty)
-- przenosimy na nowy „bez" (0), by po recolorze nie zaczęły świecić na żółto.
-- WAŻNE (D1 Console): wklej SAMĄ instrukcję UPDATE w jednej linii, bez tego komentarza (Console zjada `--`).
UPDATE ideas SET priority = 0 WHERE priority = 1;
