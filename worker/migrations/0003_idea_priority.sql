-- Personal Organizer — migracja 0003: priorytet pomysłu.
-- 1 = niski (domyślny), 2 = średni, 3 = wysoki. Sortowanie wg wagi robi front (wewnątrz grup projektów).
ALTER TABLE ideas ADD COLUMN priority INTEGER NOT NULL DEFAULT 1;
