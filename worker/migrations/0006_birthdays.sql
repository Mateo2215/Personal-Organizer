-- Personal Organizer — migracja 0006: urodziny.
-- Rocznica jest NIEJAWNA: trzymamy month+day bez roku w kluczu, więc nie trzeba co roku
-- "przezbrajać" terminu (to problem pełnych zadań cyklicznych, świadomie odłożonych do v2 #9).
-- birth_year opcjonalny — sam wiek jest miły, ale nie każdy go zna; NULL = pokazujemy samo imię.
-- last_notified_year = idempotencja roczna, dokładny wzorzec last_done_on z rutyn.
CREATE TABLE birthdays (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  month              INTEGER NOT NULL,
  day                INTEGER NOT NULL,
  birth_year         INTEGER,
  last_notified_year INTEGER,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Cron pyta co minutę "czyje dziś urodziny" — indeks trzyma to zapytanie przy zerowym koszcie.
CREATE INDEX idx_birthdays_month_day ON birthdays (month, day);
