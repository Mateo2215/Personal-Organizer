-- Rutyny: codzienne, powtarzalne zadania BEZ godziny i BEZ push.
-- "Zrobione dziś" = last_done_on == dzisiejsza data lokalna (Europe/Warsaw, liczona na froncie).
-- Reset dzienny jest automatyczny (porównanie daty), bez crona.
CREATE TABLE routines (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  content      TEXT NOT NULL,
  last_done_on TEXT,                          -- lokalna data 'YYYY-MM-DD'; NULL = nigdy nieodhaczona
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
